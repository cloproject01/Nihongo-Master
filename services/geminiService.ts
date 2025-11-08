import { GoogleGenAI, Modality } from "@google/genai";
import type { ChatMessage } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getLevelInstructions = (level: string) => {
    switch(level) {
        case 'N4':
            return 'Gunakan bahasa Jepang percakapan sehari-hari yang sederhana. Fokus pada tata bahasa dasar (bentuk masu/-te) dan kosakata umum. Buat kalimat tetap pendek dan jelas.';
        case 'N3':
            return 'Gunakan bahasa Jepang percakapan alami yang cocok untuk situasi sehari-hari. Anda bisa memperkenalkan tata bahasa dan kosakata yang sedikit lebih kompleks. Jelaskan nuansa jika pengguna tampak bingung.';
        case 'N2':
            return 'Gunakan bahasa Jepang yang lebih formal dan bernuansa, termasuk beberapa Keigo (bahasa sopan) dasar jika sesuai dengan konteks bisnis. Kosakata Anda harus lebih luas.';
        case 'N1':
            return 'Gunakan bahasa Jepang tingkat lanjut, formal, dan terkadang akademis. Tata bahasa dan kosakata Anda harus kompleks dan tepat. Jangan ragu untuk menggunakan ekspresi idiomatik.';
        default:
            return 'Gunakan bahasa Jepang percakapan sehari-hari yang sederhana.';
    }
}

export async function getAiRoleplayResponse(level: string, scenario: string, history: ChatMessage[]): Promise<string> {
    const levelInstructions = getLevelInstructions(level);

    const historyForPrompt = history.map(message => ({
        role: message.role,
        parts: [{ text: message.parts }]
    }));

    const systemInstruction = `Anda adalah seorang tutor bahasa Jepang yang cerdas dan adaptif. Peran Anda adalah terlibat dalam percakapan roleplay dengan seorang siswa.
    - Tingkat kemahiran siswa adalah JLPT ${level}. Patuhi instruksi ini: ${levelInstructions}.
    - Skenario saat ini adalah: "${scenario}".
    - Jika pengguna mengetik dalam Bahasa Indonesia, tanggapi dalam Bahasa Jepang sederhana dan berikan terjemahan Bahasa Indonesia dalam tanda kurung. Contoh: はい、そうです。(Ya, benar.).
    - Jika pengguna membuat kesalahan dalam Bahasa Jepang, koreksi dengan lembut setelah respons Anda, jelaskan koreksinya secara singkat dalam Bahasa Indonesia. Contoh: *Koreksi: 日本へ行きました (Nihon e ikimashita) lebih alami daripada 日本を行きました (Nihon o ikimashita).*
    - Jaga agar respons Anda tetap ringkas dan fokus pada roleplay.
    - Ajukan pertanyaan lanjutan untuk mendorong siswa memberikan jawaban yang lebih panjang dan mendetail.
    - Sesekali, perkenalkan kosakata baru yang relevan dengan topik dan level siswa, dan jelaskan artinya.
    - Jika relevan, berikan sedikit konteks budaya tentang frasa atau kebiasaan yang didiskusikan.
    - Tujuan Anda adalah membantu pengguna berlatih dan belajar secara aktif. Jadilah ramah, memberi semangat, dan dinamis. Aplikasi ini hanya untuk pembelajaran antara bahasa Jepang dan Indonesia.`;

    const model = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction
        },
        history: historyForPrompt.slice(0, -1), // Send all but the last message as history
    });
    
    const lastMessage = history[history.length - 1];
    
    const response = await model.sendMessage({
        message: lastMessage.parts
    });

    return response.text;
}

export async function getTextToSpeechAudio(text: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned from API.");
    }
    return base64Audio;
}

export async function getIndonesianGuidanceAudio(text: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    // Using a different voice for guidance to distinguish from content.
                    prebuiltVoiceConfig: { voiceName: 'Zephyr' }, 
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned from API for guidance.");
    }
    return base64Audio;
}