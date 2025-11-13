const { GoogleGenAI, Type } = require("@google/genai");
require('dotenv').config();

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set in backend .env");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * A helper function to retry an async operation with exponential backoff.
 * @param {Function} fn The async function to execute.
 * @param {number} retries Maximum number of retries.
 * @param {number} delay Initial delay in milliseconds.
 * @returns {Promise<any>} The result of the successful function execution.
 */
const retryWithBackoff = async (fn, retries = 3, delay = 1000) => {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            // Only retry on 5xx server errors (e.g., 503 Service Unavailable)
            if (error.status && error.status >= 500 && error.status < 600) {
                console.warn(`Attempt ${i + 1} failed with status ${error.status}. Retrying in ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2;
            } else {
                
                throw error;
            }
        }
    }
    console.error("All retry attempts failed.");
    throw lastError;
};


const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise, easy-to-understand summary of the medical report's key findings. Maximum 3 sentences.",
        },
        predictions: {
            type: Type.ARRAY,
            description: "A list of potential diseases or health issues with their corresponding probability.",
            items: {
                type: Type.OBJECT,
                properties: {
                    disease: { type: Type.STRING },
                    probability: { type: Type.NUMBER },
                },
                 required: ["disease", "probability"],
            },
        },
        healthScore: {
            type: Type.INTEGER,
            description: "A holistic health score from 0 (poor) to 100 (excellent), based on the overall report data.",
        },
        recommendations: {
            type: Type.ARRAY,
            description: "A list of 3-5 actionable health recommendations or next steps for the user.",
            items: { type: Type.STRING }
        },
    },
    required: ["summary", "predictions", "healthScore", "recommendations"],
};

const analyzeHealthReport = async ({ reportText, fileData }) => {
    try {
        let contents;
        const prompt = "Analyze the provided medical report. Based on the data, generate a health analysis according to the provided JSON schema. The report content is either in the following text or in the attached PDF file.";

        if (fileData && fileData.data) {
            contents = {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: fileData.mimeType,
                            data: fileData.data,
                        },
                    },
                ],
            };
        } else if (reportText) {
            contents = `${prompt}\n\nHere is the report:\n\n${reportText}`;
        } else {
            throw new Error("No report data provided to analyze.");
        }

        const response = await retryWithBackoff(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
            },
        }));
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        if (!parsedJson.healthScore || !parsedJson.summary) {
             throw new Error("AI response is missing required fields.");
        }

        return parsedJson;

    } catch (error) {
        console.error("Error analyzing health report with Gemini:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Failed to parse the AI's JSON response. The model may have returned an unexpected format.");
        }
        throw new Error("Failed to get a valid analysis from the AI.");
    }
};

const getChatResponse = async (message, history = [], userContext = null) => {
    const model = 'gemini-2.5-flash';

    let systemInstruction = 'You are a friendly and helpful AI health assistant providing information relevant to Nepal. You can answer general health questions. When providing emergency contact information, use Nepali emergency numbers (e.g., Police: 100, Ambulance: 102). You are not a doctor and must always remind the user to consult a healthcare professional for medical advice. Keep your answers concise and easy to understand.';

    if (userContext) {
        systemInstruction += ` Personalize your response for the following user: Age: ${userContext.age}, Weight: ${userContext.weight || 'N/A'}kg. Pre-existing conditions: ${userContext.medical_conditions || 'None'}. Current symptoms: ${userContext.symptoms || 'None'}.`;
    }

    const chat = ai.chats.create({
        model,
        config: {
            systemInstruction,
        },
        history: history,
    });

    try {
        const response = await retryWithBackoff(() => chat.sendMessage({ message }));
        return response.text;
    } catch (error) {
        console.error("Error getting chat response:", error);
        throw new Error("Could not get a response from the assistant.");
    }
};

const symptomPredictionSchema = {
    type: Type.OBJECT,
    properties: {
        predictions: {
            type: Type.ARRAY,
            description: "A list of 3-5 potential diseases based on the symptoms, ranked from most to least likely.",
            items: {
                type: Type.OBJECT,
                properties: {
                    disease: { type: Type.STRING, description: "Name of the potential disease." },
                    probability: { type: Type.NUMBER, description: "A score from 0.0 to 1.0 indicating likelihood." },
                    description: { type: Type.STRING, description: "A brief, 1-2 sentence explanation of the disease and why it might match the symptoms." },
                    specialist: { type: Type.STRING, description: "The type of medical specialist to consult for this condition (e.g., Cardiologist, Neurologist)." },
                },
                required: ["disease", "probability", "description", "specialist"],
            },
        },
    },
    required: ["predictions"],
};

const predictSymptomsFromText = async (symptomsText) => {
    try {
        const prompt = `You are an AI Symptom Checker. Analyze the following symptoms and provide a list of potential diseases. For each disease, include its probability, a brief description, and the recommended medical specialist. IMPORTANT: This is for informational purposes only and is not a substitute for professional medical advice. Symptoms: "${symptomsText}"`;

        const response = await retryWithBackoff(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: symptomPredictionSchema,
            },
        }));
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        if (!parsedJson.predictions) {
             throw new Error("AI response is missing the 'predictions' field.");
        }
        return parsedJson;

    } catch (error) {
        console.error("Error predicting symptoms with Gemini:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Failed to parse the AI's JSON response for symptoms.");
        }
        throw new Error("Failed to get a valid prediction from the AI.");
    }
};

const findHospitalsNearLocation = async ({ latitude, longitude, query }) => {
    try {
        let contents;
        const config = { tools: [{googleMaps: {}}] };

        if (latitude && longitude) {
            contents = query ? 
                `${query}. Provide a brief summary and list them.` : 
                "What hospitals are nearby my current location? Provide a brief summary and list them.";
            config.toolConfig = {
                retrievalConfig: {
                    latLng: { latitude, longitude }
                }
            };
        } else if (query) {
            contents = `What hospitals are near ${query}? Provide a brief summary and list them.`;
            // No toolConfig needed for query-based search
        } else {
            throw new Error("No location data provided to find hospitals.");
        }
        
        const response = await retryWithBackoff(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config,
        }));

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        const hospitals = (chunks || [])
            .filter(chunk => chunk.maps && chunk.maps.uri && chunk.maps.title)
            .map(chunk => ({
                name: chunk.maps.title,
                uri: chunk.maps.uri,
            }));

        const summaryText = response.text || "Here are some hospitals found near your location.";

        return {
            summary: summaryText,
            hospitals: hospitals,
        };

    } catch (error) {
        console.error("Error finding hospitals with Gemini:", error);
        throw new Error("Failed to get hospital data from the AI.");
    }
};


const healthTipsSchema = {
  type: Type.OBJECT,
  properties: {
    tips: {
      type: Type.ARRAY,
      description: "A list of 3-4 concise, actionable, and personalized health tips.",
      items: { type: Type.STRING }
    },
  },
  required: ["tips"],
};

const generateHealthTips = async (analysisData) => {
    try {
        const { healthScore, summary, predictions } = analysisData;
        const potentialRisks = predictions.map(p => `${p.disease} (${(p.probability * 100).toFixed(0)}% risk)`).join(', ');

        const prompt = `
            Based on the following health summary, generate 3-4 personalized, actionable, and encouraging health tips.
            The tips should be directly related to the provided data. Be creative and helpful.
            
            Health Score: ${healthScore}/100
            AI Summary: "${summary}"
            Potential Risks: ${potentialRisks || "None detected"}
            
            Generate the tips according to the JSON schema.
        `;

        const response = await retryWithBackoff(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: healthTipsSchema,
            },
        }));

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        if (!parsedJson.tips || !Array.isArray(parsedJson.tips)) {
            throw new Error("AI response for tips is in an invalid format.");
        }
        return parsedJson.tips;

    } catch (error) {
        console.error("Error generating health tips with Gemini:", error);
        throw new Error("Failed to generate health tips from the AI.");
    }
};


module.exports = { analyzeHealthReport, getChatResponse, predictSymptomsFromText, findHospitalsNearLocation, generateHealthTips };