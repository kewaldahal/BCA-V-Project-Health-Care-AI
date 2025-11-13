const express = require('express');
const { analyzeHealthReport, getChatResponse, predictSymptomsFromText, findHospitalsNearLocation, generateHealthTips } = require('../services/geminiService');
const db = require('../database.js');

const router = express.Router();

router.get('/profile', (req, res) => {
    const userId = req.user.id;
    const userSql = "SELECT id, name, email, age, weight, medical_conditions, symptoms FROM users WHERE id = ?";
    const analysesSql = "SELECT id, summary, health_score, created_at FROM analyses WHERE user_id = ? ORDER BY created_at DESC";

    db.get(userSql, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: "Error fetching user data." });
        }
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        db.all(analysesSql, [userId], (err, analyses) => {
            if (err) {
                return res.status(500).json({ error: "Error fetching analyses." });
            }
            res.json({ user, analyses });
        });
    });
});

router.put('/profile', (req, res) => {
    const userId = req.user.id;
    const { medical_conditions, symptoms } = req.body;

    const sql = `UPDATE users SET medical_conditions = ?, symptoms = ? WHERE id = ?`;
    db.run(sql, [medical_conditions, symptoms, userId], function(err) {
        if (err) {
            console.error("DB Error updating profile:", err.message);
            return res.status(500).json({ error: "Could not update profile." });
        }
        // Fetch the updated user to return it
        db.get("SELECT id, name, email, age, weight, medical_conditions, symptoms FROM users WHERE id = ?", [userId], (err, user) => {
            if (err) {
                return res.status(500).json({ error: "Could not retrieve updated profile." });
            }
            res.json({ user });
        });
    });
});

router.post('/analyze', async (req, res) => {
    const { reportText, fileData } = req.body;
    const userId = req.user.id; // from auth middleware

    if (!reportText && !fileData) {
        return res.status(400).json({ error: "Report text or file is required." });
    }

    try {
        const analysisResult = await analyzeHealthReport({ reportText, fileData });
        
        // Store analysis in DB
        const { summary, predictions, healthScore, recommendations } = analysisResult;
        const reportDataToStore = reportText || `[Analyzed PDF file]`;
        const sql = `INSERT INTO analyses (user_id, report_data, summary, predictions, health_score, recommendations) VALUES (?,?,?,?,?,?)`;
        const params = [userId, reportDataToStore, summary, JSON.stringify(predictions), healthScore, JSON.stringify(recommendations)];
        
        db.run(sql, params, function(err) {
            if (err) {
                console.error("DB Error storing analysis:", err.message);
                // Non-fatal, proceed with sending response to user
            }
        });

        res.json(analysisResult);

    } catch (error) {
        console.error("Error in /analyze route:", error);
        res.status(500).json({ error: error.message || "An internal error occurred during analysis." });
    }
});


router.post('/chat', async (req, res) => {
    const { message, history, voiceConfig } = req.body;
    const userId = req.user.id;

    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    // Fetch user context for personalization
    const userSql = "SELECT age, weight, medical_conditions, symptoms FROM users WHERE id = ?";
    db.get(userSql, [userId], async (err, userContext) => {
        if (err) {
            console.error("DB error fetching user context:", err.message);
            // Proceed without personalization if user fetch fails
            userContext = null; 
        }
        
        try {
            const responseData = await getChatResponse(message, history, userContext, voiceConfig);
            res.json(responseData);
        } catch (error) {
            console.error("Error in /chat route:", error);
            res.status(500).json({ error: error.message });
        }
    });
});

router.post('/predict-symptoms', async (req, res) => {
    const { symptoms } = req.body;
    if (!symptoms) {
        return res.status(400).json({ error: "Symptoms text is required." });
    }
    try {
        const result = await predictSymptomsFromText(symptoms);
        res.json(result);
    } catch (error) {
        console.error("Error in /predict-symptoms route:", error);
        res.status(500).json({ error: error.message || "An internal error occurred during symptom prediction." });
    }
});

router.post('/find-hospitals', async (req, res) => {
    const { lat, lon, query } = req.body;
    if ((lat === undefined || lon === undefined) && !query) {
        return res.status(400).json({ error: "Either coordinates or a location query is required." });
    }
    try {
        const result = await findHospitalsNearLocation({ latitude: lat, longitude: lon, query });
        res.json(result);
    } catch (error) {
        console.error("Error in /find- route:", error);
        res.status(500).json({ error: error.message || "An internal error occurred while finding hospitals." });
    }
});

router.get('/latest-analysis', (req, res) => {
    const userId = req.user.id;
    const sql = `SELECT summary, predictions, health_score, recommendations FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`;

    db.get(sql, [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error." });
        }
        if (!row) {
            return res.status(404).json({ error: "No analysis found." });
        }
        // The DB stores predictions and recommendations as JSON strings
        const result = {
            ...row,
            predictions: JSON.parse(row.predictions || '[]'),
            recommendations: JSON.parse(row.recommendations || '[]'),
            healthScore: row.health_score
        };
        res.json(result);
    });
});

router.post('/health-tips', async (req, res) => {
    const { analysis } = req.body;
    if (!analysis) {
        return res.status(400).json({ error: "Analysis data is required." });
    }
    try {
        const tips = await generateHealthTips(analysis);
        res.json({ tips });
    } catch (error) {
         res.status(500).json({ error: error.message || "Failed to generate health tips." });
    }
});


module.exports = router;
