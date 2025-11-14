const { GoogleGenAI, Type, Modality } = require("@google/genai");
require('dotenv').config();

// Support multiple API keys for different purposes. Fall back to single API_KEY when specific ones are not provided.
const ANALYZE_API_KEY = process.env.ANALYZE_API_KEY || process.env.API_KEY;
const SYMPTOMS_API_KEY = process.env.SYMPTOMS_API_KEY || process.env.API_KEY;
const CHAT_API_KEY = process.env.CHAT_API_KEY || process.env.API_KEY;
const TTS_API_KEY = process.env.TTS_API_KEY || process.env.API_KEY;
const MAPS_API_KEY = process.env.MAPS_API_KEY || process.env.API_KEY;

if (!ANALYZE_API_KEY && !SYMPTOMS_API_KEY && !CHAT_API_KEY && !TTS_API_KEY && !MAPS_API_KEY) {
    throw new Error("No API keys found. Set ANALYZE_API_KEY, SYMPTOMS_API_KEY, CHAT_API_KEY, TTS_API_KEY or API_KEY in backend .env");
}

// Create separate clients so different keys can be used for different features.
const aiAnalyze = new GoogleGenAI({ apiKey: ANALYZE_API_KEY });
const aiSymptoms = new GoogleGenAI({ apiKey: SYMPTOMS_API_KEY });
const aiChat = new GoogleGenAI({ apiKey: CHAT_API_KEY });
const aiTTS = new GoogleGenAI({ apiKey: TTS_API_KEY });
const aiMaps = new GoogleGenAI({ apiKey: MAPS_API_KEY });

/**
 * A helper function to retry an async operation with exponential backoff.
 * @param {Function} fn The async function to execute.
 * @param {number} retries Maximum number of retries.
 * @param {number} delay Initial delay in milliseconds.
 * @returns {Promise<any>} The result of the successful function execution.
 */
const retryWithBackoff = async (fn, retries = 5, delay = 1000, jitter = 200) => {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            // Only retry on 5xx server errors (e.g., 503 Service Unavailable)
            if (error.status && error.status >= 500 && error.status < 600) {
                const jitterDelay = Math.random() * jitter;
                const waitTime = delay + jitterDelay;
                console.warn(`Attempt ${i + 1} failed with status ${error.status}. Retrying in ${waitTime.toFixed(0)}ms...`);
                await new Promise(res => setTimeout(res, waitTime));
                delay *= 2; // Exponential backoff
            } else {
                // Don't retry on client errors (4xx) or other non-retryable issues
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

        const response = await retryWithBackoff(() => aiAnalyze.models.generateContent({
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

async function textToSpeech(text, voice, model) {
    try {
        const prompt = `Say: ${text}`;
        
        const response = await retryWithBackoff(() => aiTTS.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        }));

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from TTS API.");
        }
        return base64Audio;

    } catch (error) {
        console.error("Error generating speech with Gemini TTS:", error);
        // Return null instead of throwing, so the chat can still proceed with text.
        return null;
    }
}

async function getChatResponseTextOnly(message, history, userContext) {
    return await retryWithBackoff(async () => {
        const model = aiChat.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: history || [],
        });

        const personalizedPrompt = `
            You are a compassionate and highly knowledgeable medical AI assistant. 
            Your name is "Health-Care-AI".
            User Context: 
            - Age: ${userContext?.age || 'Not provided'}
            - Weight: ${userContext?.weight || 'Not provided'}
            - Known Medical Conditions: ${userContext?.medical_conditions || 'None'}
            - Current Symptoms: ${userContext?.symptoms || 'None'}

            Based on this context and the conversation history, provide a helpful, safe, and informative response. 
            **Disclaimer: Always remind the user that you are an AI and they should consult a real doctor for medical advice.**
            
            User's message: "${message}"
        `;

        const result = await chat.sendMessage(personalizedPrompt);
        const response = await result.response;
        const text = response.text();

        return { response: text };
    });
}

async function getChatResponse(message, history, userContext, voiceConfig) {
    const model = 'gemini-1.5-flash'; // Upgraded model for potentially faster and better responses

    let systemInstruction = 'You are a friendly and helpful AI health assistant providing information relevant to Nepal. You can answer general health questions. When providing emergency contact information, use Nepali emergency numbers (e.g., Police: 100, Ambulance: 102). You are not a doctor and must always remind the user to consult a healthcare professional for medical advice. Keep your answers concise and easy to understand. Do Not Reply if User Answers are Inappropriate or Irrelevant or out of Context. Answer only Medical Related Questions.';

    if (userContext) {
        systemInstruction += ` Personalize your response for the following user: Age: ${userContext.age}, Weight: ${userContext.weight || 'N/A'}kg. Pre-existing conditions: ${userContext.medical_conditions || 'None'}. Current symptoms: ${userContext.symptoms || 'None'}.`;
    }

    const chat = aiChat.chats.create({
        model,
        config: {
            systemInstruction,
        },
        history: history,
    });

    try {
        // Get the text response first.
        const response = await retryWithBackoff(() => chat.sendMessage({ message }));
        const responseText = response.text;

        // Generate audio in parallel, but don't wait for it to return the text.
        let audioPromise = null;
        if (voiceConfig.enabled && responseText) {
            audioPromise = textToSpeech(responseText, voiceConfig.voice);
        }

        // Return the text response immediately.
        const result = { response: responseText, audio: null };

        // If audio is being generated, wait for it and then include it.
        if (audioPromise) {
            result.audio = await audioPromise;
        }

        return result;
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

const predictSymptomsFromText = async (symptomsText, userContext = null) => {
    const primaryModel = 'gemini-1.5-flash';
    const fallbackModel = 'gemini-pro'; // A reliable fallback

    let prompt = `You are an AI Symptom Checker. Analyze the following symptoms for a user and provide a list of potential diseases. For each disease, include its probability, a brief description, and the recommended medical specialist. IMPORTANT: This is for informational purposes only and is not a substitute for professional medical advice. Symptoms: "${symptomsText}"`;

    if (userContext) {
        prompt += `\n\nUser context: Age: ${userContext.age}, Pre-existing conditions: ${userContext.medical_conditions || 'None'}.`;
    }

    const generate = async (model) => {
        console.log(`Attempting symptom prediction with model: ${model}`);
        return await retryWithBackoff(() => aiSymptoms.models.generateContent({
            model,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: symptomPredictionSchema,
            },
        }));
    };

    try {
        let response;
        try {
            response = await generate(primaryModel);
        } catch (error) {
            // If the primary model is overloaded (503), try the fallback.
            if (error.status === 503) {
                console.warn(`Primary model (${primaryModel}) is overloaded. Switching to fallback model (${fallbackModel}).`);
                response = await generate(fallbackModel);
            } else {
                throw error; // Re-throw other errors
            }
        }
        
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
        
        const response = await retryWithBackoff(() => aiMaps.models.generateContent({
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

        const response = await retryWithBackoff(() => aiAnalyze.models.generateContent({
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


module.exports = { analyzeHealthReport, getChatResponse, getChatResponseTextOnly, predictSymptomsFromText, findHospitalsNearLocation, generateHealthTips };
