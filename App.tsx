import React, { useState, useCallback, useEffect, useRef, useImperativeHandle } from 'react';
import { Bot, BookOpen, BrainCircuit, MessageSquare, ChevronLeft, Lock, Sparkles, Speaker as SpeakerIcon, BookMarked, HelpCircle, Pencil, Shuffle, Lightbulb } from './components/Icons';
import { Spinner } from './components/Spinner';
import type { JlptLevel, ChatMessage, EbookChapter } from './types';
import { getAiRoleplayResponse, getTextToSpeechAudio, getIndonesianGuidanceAudio } from './services/geminiService';

// Mock Data for the app
const MOCK_LEVELS: JlptLevel[] = [
    { id: 'N4', name: 'N4', title: 'Dasar-Dasar Fundamental', description: 'Kuasai percakapan sehari-hari dan tata bahasa esensial.', kanjiCount: 300, vocabCount: 1500, progress: 100, unlocked: true, icon: <BookOpen /> },
    { id: 'N3', name: 'N3', title: 'Jembatan Menengah', description: 'Pahami artikel sehari-hari dan ikuti percakapan.', kanjiCount: 650, vocabCount: 3750, progress: 0, unlocked: false, icon: <MessageSquare /> },
    { id: 'N2', name: 'N2', title: 'Bisnis & Nuansa', description: 'Pahami bahasa formal untuk lingkungan profesional.', kanjiCount: 1000, vocabCount: 6000, progress: 0, unlocked: false, icon: <BrainCircuit /> },
    { id: 'N1', name: 'N1', title: 'Kemahiran Tingkat Ahli', description: 'Pahami topik yang kompleks, abstrak, dan akademis.', kanjiCount: 2000, vocabCount: 10000, progress: 0, unlocked: false, icon: <Sparkles /> }
];

const MOCK_CONTENT = {
    N4: {
        kanji: ['日', '一', '国', '人', '年', '大', '十', '二', '本', '中', '見', '行', '食', '出', '入'],
        vocab: [
            'わたし (saya)', 'あなた (Anda)', 'かれ (dia laki-laki)', 'かのじょ (dia perempuan)', 'です (adalah/to be)',
            'がくせい (siswa)', 'せんせい (guru)', 'かいしゃいん (karyawan)', 'ほん (buku)', 'えいが (film)',
            'たべます (makan)', 'のみます (minum)', 'みます (melihat)', 'いきます (pergi)', 'きます (datang)'
        ],
        grammar: [
            'Partikel が (ga) - Penanda subjek', 'Partikel は (wa) - Penanda topik', 'Bentuk ます (masu) kata kerja',
            'Partikel の (no) - Kepemilikan', 'Kata tunjuk これ/それ/あれ (ini/itu)'
        ],
        scenarios: ['Memesan di kafe', 'Menanyakan arah', 'Memperkenalkan diri', 'Berbicara tentang hobi'],
        sentences: [
            { ja: 'わたしはがくせいです。', id: 'Saya adalah seorang siswa.' },
            { ja: 'これはほんです。', id: 'Ini adalah sebuah buku.' },
            { ja: 'ねこがいます。', id: 'Ada seekor kucing.' },
            { ja: 'きのう、えいがをみました。', id: 'Kemarin, saya menonton film.' },
            { ja: 'これはわたしのかばんです。', id: 'Ini adalah tas saya.' }
        ]
    },
    N3: {
        kanji: ['政', '議', '民', '連', '対', '部', '合', '市', '内', '相', '選', '米', '力', '関', '全'],
        vocab: [
            '情報 (じょうほう - informasi)', '経済 (けいざい - ekonomi)', '社会 (しゃかい - masyarakat)', '問題 (もんだい - masalah)', '必要 (ひつよう - perlu)',
            '場合 (ばあい - kasus/jika)', '理由 (りゆう - alasan)', '関係 (かんけい - hubungan)', '将来 (しょうらい - masa depan)', '続ける (つづける - melanjutkan)'
        ],
        grammar: ['~はずだ (seharusnya)', '~さえ (bahkan)', '~に対して (にたいして - terhadap)', 'Bentuk pasif (受身形 - ukemikei)', 'Bentuk kausatif (使役形 - shiekikei)'],
        scenarios: ['Mendiskusikan artikel berita', 'Membuat rencana dengan teman', 'Memahami pengumuman publik', 'Memberikan pendapat dalam rapat'],
        sentences: [
            { ja: 'このもんだいはふくざつだとおもいます。', id: 'Saya pikir masalah ini rumit.' },
            { ja: 'かれがくるはずです。', id: 'Dia seharusnya datang.' },
            { ja: 'てつだってくれて、かんしゃしています。', id: 'Saya berterima kasih Anda telah membantu saya.' },
            { ja: 'こどもにしんぶんをよませます。', id: 'Saya membuat anak saya membaca koran.' },
            { ja: 'せんせいにほめられました。', id: 'Saya dipuji oleh guru.' }
        ]
    },
    // N2 and N1 would have similar structures
};

const MOCK_EBOOK_CONTENT: { [key: string]: EbookChapter[] } = {
    N4: [
        {
            title: "Pengantar Partikel Dasar",
            content: [
                { type: 'h2', text: 'Memahami Partikel は (wa) dan が (ga)' },
                { type: 'p', text: 'Partikel adalah kunci untuk memahami struktur kalimat Jepang. は (wa) menandai topik kalimat, sementara が (ga) menandai subjek. Perbedaan ini sangat penting.' },
                { type: 'example', text: 'わたしはがくせいです。 (Saya adalah seorang siswa.)' },
                { type: 'example', text: 'ねこがいます。 (Ada seekor kucing.)' },
                { type: 'p', text: 'Dalam kalimat pertama, "saya" adalah topik pembicaraan. Di kalimat kedua, "kucing" adalah subjek yang melakukan keberadaan.' },
                { type: 'h2', text: 'Partikel を (o) dan に (ni)' },
                { type: 'p', text: 'を (o) menandai objek langsung dari sebuah kata kerja. に (ni) menandai tujuan, lokasi keberadaan, atau waktu spesifik.' },
                { type: 'example', text: 'パンをたべます。 (Saya makan roti.)' },
                { type: 'example', text: 'がっこうにいきます。 (Saya pergi ke sekolah.)' },
                { type: 'example', text: 'しちじにおきます。 (Saya bangun jam 7.)' },
            ]
        },
        {
            title: "Kata Kerja Bentuk -masu",
            content: [
                { type: 'h2', text: 'Bentuk Sopan Kata Kerja' },
                { type: 'p', text: 'Bentuk -masu adalah bentuk kata kerja standar yang sopan, digunakan dalam percakapan sehari-hari. Ini adalah bentuk pertama yang harus Anda pelajari.' },
                { type: 'example', text: 'たべます (tabemasu - makan)' },
                { type: 'example', text: 'のみます (nomimasu - minum)' },
                { type: 'example', text: 'いきます (ikimasu - pergi)' },
                { type: 'p', text: 'Untuk mengubahnya menjadi bentuk negatif, ganti -masu dengan -masen.' },
                { type: 'example', text: 'たべません (tabemasen - tidak makan)' },
            ]
        },
        {
            title: "Salam Sehari-hari",
            content: [
                { type: 'h2', text: 'Salam Dasar' },
                { type: 'p', text: 'Menguasai salam adalah langkah pertama untuk terdengar alami dalam bahasa Jepang.' },
                { type: 'example', text: 'おはようございます (Ohayou gozaimasu - Selamat pagi)' },
                { type: 'example', text: 'こんにちは (Konnichiwa - Selamat siang/Halo)' },
                { type: 'example', text: 'こんばんは (Konbanwa - Selamat malam)' },
                { type: 'example', text: 'ありがとうございます (Arigatou gozaimasu - Terima kasih banyak)' },
                { type: 'example', text: 'すみません (Sumimasen - Maaf/Permisi)' },
            ]
        },
        {
            title: "Menggunakan Kata Sifat",
            content: [
                { type: 'h2', text: 'Kata Sifat-i dan Kata Sifat-na' },
                { type: 'p', text: 'Ada dua jenis kata sifat dalam bahasa Jepang: i-adjectives dan na-adjectives. Mereka memiliki aturan konjugasi yang berbeda.' },
                { type: 'example', text: 'おおきい (ookii - besar) - i-adjective' },
                { type: 'example', text: 'しずかな (shizukana - tenang) - na-adjective' },
                { type: 'p', text: 'Contoh dalam kalimat:' },
                { type: 'example', text: 'このやまはおおきいです。 (Gunung ini besar.)' },
                { type: 'example', text: 'このまちはしずかです。 (Kota ini tenang.)' },
            ]
        }
    ]
};

const HIRAGANA_CHARS = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ', 'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ', 'わ', 'を', 'ん'];
const KATAKANA_CHARS = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ワ', 'ヲ', 'ン'];

const ALPHABET_CARD: JlptLevel = {
    id: 'ALPHABET',
    name: 'あア',
    title: 'Dasar-Dasar Alfabet',
    description: 'Pelajari Hiragana & Katakana, fondasi bahasa Jepang.',
    kanjiCount: 0,
    vocabCount: 92,
    progress: 100,
    unlocked: true,
    icon: <BookMarked />
};

// Stroke order guides for the first 5 characters of Hiragana and Katakana as examples
const STROKE_ORDER_GUIDES: { [key: string]: React.ReactElement } = {
    'あ': (
        <svg viewBox="0 0 100 100">
            <path d="M 35,20 H 65 M 50,20 V 45 C 50,60 30,75 50,85 C 70,95 80,70 70,60 C 60,50 45,65 30,70" stroke="#555" strokeWidth="2" fill="none" />
            <path d="M 35,20 H 65" stroke="#f472b6" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <path d="M 50,20 V 45" stroke="#a78bfa" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <path d="M 50,45 C 50,60 30,75 50,85 C 70,95 80,70 70,60 C 60,50 45,65 30,70" stroke="#60a5fa" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <text x="70" y="20" fill="#f472b6" fontSize="10">1</text>
            <text x="55" y="30" fill="#a78bfa" fontSize="10">2</text>
            <text x="30" y="60" fill="#60a5fa" fontSize="10">3</text>
        </svg>
    ),
    'い': (
        <svg viewBox="0 0 100 100">
            <path d="M 35,25 C 35,40 45,55 50,55 M 65,35 C 65,50 60,65 55,65" stroke="#555" strokeWidth="2" fill="none" />
            <path d="M 35,25 C 35,40 45,55 50,55" stroke="#f472b6" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <path d="M 65,35 C 65,50 60,65 55,65" stroke="#a78bfa" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <text x="30" y="20" fill="#f472b6" fontSize="10">1</text>
            <text x="70" y="30" fill="#a78bfa" fontSize="10">2</text>
        </svg>
    ),
     'う': (
        <svg viewBox="0 0 100 100">
            <path d="M 40,20 H 60 M 35,40 C 50,30 65,40 65,60 C 65,80 35,80 35,60 C 35,40 50,50 50,50" stroke="#555" strokeWidth="2" fill="none" />
            <path d="M 40,20 H 60" stroke="#f472b6" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <path d="M 35,40 C 50,30 65,40 65,60 C 65,80 35,80 35,60 C 35,40 50,50 50,50" stroke="#a78bfa" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <text x="65" y="20" fill="#f472b6" fontSize="10">1</text>
            <text x="30" y="40" fill="#a78bfa" fontSize="10">2</text>
        </svg>
    ),
    'ア': (
        <svg viewBox="0 0 100 100">
            <path d="M 40,30 H 60 M 50,30 C 40,60 30,80 20,70 M 50,30 C 60,60 70,80 80,70" stroke="#555" strokeWidth="2" fill="none" />
            <path d="M 40,30 H 60" stroke="#f472b6" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <path d="M 50,30 C 40,60 30,80 20,70" stroke="#a78bfa" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <text x="65" y="30" fill="#f472b6" fontSize="10">1</text>
            <text x="45" y="55" fill="#a78bfa" fontSize="10">2</text>
        </svg>
    ),
    'イ': (
        <svg viewBox="0 0 100 100">
            <path d="M 40,30 L 60,20 M 50,40 V 80" stroke="#555" strokeWidth="2" fill="none" />
            <path d="M 40,30 L 60,20" stroke="#f472b6" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <path d="M 50,40 V 80" stroke="#a78bfa" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
            <text x="35" y="25" fill="#f472b6" fontSize="10">1</text>
            <text x="55" y="55" fill="#a78bfa" fontSize="10">2</text>
        </svg>
    ),
};


// Helper function to decode raw PCM audio data from Gemini API
async function decodeRawAudioData(
    audioContext: AudioContext,
    rawPcmData: ArrayBuffer
): Promise<AudioBuffer> {
    const sampleRate = 24000; // Gemini TTS API returns audio at 24000 Hz
    const numChannels = 1;     // Mono audio
    
    // The raw data is 16-bit signed integers (PCM S16LE)
    const dataInt16 = new Int16Array(rawPcmData);
    const frameCount = dataInt16.length / numChannels;
    
    const audioBuffer = audioContext.createBuffer(
        numChannels,
        frameCount,
        sampleRate
    );
    
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Convert the 16-bit integer to a float between -1.0 and 1.0, which Web Audio API expects
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    
    return audioBuffer;
}

const HelpButton: React.FC<{
    guidanceText: string;
    onSpeak: (text: string) => void;
    isSpeaking: boolean;
    speakingText: string | null;
}> = ({ guidanceText, onSpeak, isSpeaking, speakingText }) => {
    const isCurrentlySpeaking = isSpeaking && speakingText === guidanceText;
    return (
        <button
            onClick={() => onSpeak(guidanceText)}
            disabled={isSpeaking}
            aria-label={`Dengarkan panduan untuk bagian ini`}
            className="inline-flex items-center justify-center text-gray-500 hover:text-purple-400 p-1 rounded-full hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-wait ml-2"
        >
            {isCurrentlySpeaking ? <Spinner className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
        </button>
    );
};


const App: React.FC = () => {
    const [levels, setLevels] = useState<JlptLevel[]>(MOCK_LEVELS);
    const [selectedLevel, setSelectedLevel] = useState<JlptLevel | null>(null);
    const [viewingAlphabet, setViewingAlphabet] = useState(false);
    const [practicingChar, setPracticingChar] = useState<string | null>(null);
    const [isSpeakingContent, setIsSpeakingContent] = useState(false);
    const [speakingContentText, setSpeakingContentText] = useState<string | null>(null);
    const [isSpeakingGuidance, setIsSpeakingGuidance] = useState(false);
    const [speakingGuidanceText, setSpeakingGuidanceText] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext. It's best to create it once.
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => {
          audioContextRef.current?.close();
        }
    }, []);

    const speakContent = useCallback(async (text: string) => {
        if (isSpeakingContent || isSpeakingGuidance || !text || !audioContextRef.current) return;

        // Clean text to prevent API errors. 
        const cleanTextForSpeech = text.split('\n')[0].replace(/\s*\(.*?\)\s*/g, '').trim();

        if (!cleanTextForSpeech) {
            console.warn("Skipping TTS for empty text after cleaning. Original:", text);
            return;
        }

        // FIX: If the text is a single character (likely a Kanji), wrap it in a 
        // descriptive sentence to provide context for the TTS API.
        let textToSendToApi = cleanTextForSpeech;
        if (cleanTextForSpeech.length === 1) {
            textToSendToApi = `「${cleanTextForSpeech}」と読みます。`; // "It is read as [character]."
        }

        const audioContext = audioContextRef.current;
        setSpeakingContentText(text); // Use original text to identify which button is active in the UI
        setIsSpeakingContent(true);

        try {
            const base64Audio = await getTextToSpeechAudio(textToSendToApi);
            const binaryString = window.atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const audioBuffer = await decodeRawAudioData(audioContext, bytes.buffer);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
            
            source.onended = () => {
               setIsSpeakingContent(false);
               setSpeakingContentText(null);
            };
        } catch (error) {
            console.error("Error playing audio:", error);
            if (error instanceof Error && error.message.includes("No audio data returned")) {
                console.error(`TTS API likely failed for text: "${textToSendToApi}"`);
            }
            setIsSpeakingContent(false);
            setSpeakingContentText(null);
        }
    }, [isSpeakingContent, isSpeakingGuidance]);

    const speakGuidance = useCallback(async (text: string) => {
        if (isSpeakingContent || isSpeakingGuidance || !text || !audioContextRef.current) return;

        const audioContext = audioContextRef.current;
        setSpeakingGuidanceText(text);
        setIsSpeakingGuidance(true);

        try {
            const base64Audio = await getIndonesianGuidanceAudio(text);
            const binaryString = window.atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const audioBuffer = await decodeRawAudioData(audioContext, bytes.buffer);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
            
            source.onended = () => {
               setIsSpeakingGuidance(false);
               setSpeakingGuidanceText(null);
            };
        } catch (error) {
            console.error("Error playing guidance audio:", error);
            setIsSpeakingGuidance(false);
            setSpeakingGuidanceText(null);
        }
    }, [isSpeakingContent, isSpeakingGuidance]);


    const handleSelectLevel = (level: JlptLevel) => {
        if (level.unlocked) {
            setSelectedLevel(level);
        }
    };

    const handleUnlockNextLevel = () => {
        const currentIndex = levels.findIndex(l => l.id === selectedLevel?.id);
        if (currentIndex !== -1 && currentIndex < levels.length - 1) {
            const nextLevelIndex = currentIndex + 1;
            if (!levels[nextLevelIndex].unlocked) {
                const updatedLevels = [...levels];
                updatedLevels[nextLevelIndex].unlocked = true;
                updatedLevels[currentIndex].progress = 100; // Mark current level as complete
                setLevels(updatedLevels);
                alert(`${levels[nextLevelIndex].name} Terbuka! Anda sekarang dapat mengakses level berikutnya.`);
            }
        }
    };

    const renderContent = () => {
        if (practicingChar) {
            return <WritingPracticeView
                character={practicingChar}
                onBack={() => setPracticingChar(null)}
                onSpeakGuidance={speakGuidance}
                isSpeakingGuidance={isSpeakingGuidance}
                speakingGuidanceText={speakingGuidanceText}
            />
        }
        if (viewingAlphabet) {
            return <AlphabetView 
                onBack={() => setViewingAlphabet(false)}
                onSpeak={speakContent}
                isSpeaking={isSpeakingContent}
                speakingText={speakingContentText}
                onStartPractice={(char) => setPracticingChar(char)}
                onSpeakGuidance={speakGuidance}
                isSpeakingGuidance={isSpeakingGuidance}
                speakingGuidanceText={speakingGuidanceText}
            />;
        }
        if (selectedLevel) {
            return <LevelView 
                level={selectedLevel} 
                onBack={() => setSelectedLevel(null)}
                onUnlockNextLevel={handleUnlockNextLevel}
                onSpeak={speakContent}
                isSpeaking={isSpeakingContent}
                speakingText={speakingContentText}
                onSpeakGuidance={speakGuidance}
                isSpeakingGuidance={isSpeakingGuidance}
                speakingGuidanceText={speakingGuidanceText}
            />;
        }
        return <Dashboard 
            levels={levels} 
            onSelectLevel={handleSelectLevel}
            onSelectAlphabet={() => setViewingAlphabet(true)}
            onSpeakGuidance={speakGuidance}
            isSpeakingGuidance={isSpeakingGuidance}
            speakingGuidanceText={speakingGuidanceText}
        />;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8 transition-all duration-500">
            {/* SVG definitions for stroke order markers */}
            <svg width="0" height="0" style={{position: 'absolute'}}>
                <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                    </marker>
                </defs>
            </svg>
            <main className="max-w-7xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
                        Nihongo Master
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">Perjalanan Anda menuju kefasihan berbahasa Jepang dengan dukungan AI.</p>
                </header>
                {renderContent()}
            </main>
        </div>
    );
};

const Dashboard: React.FC<{ 
    levels: JlptLevel[], 
    onSelectLevel: (level: JlptLevel) => void,
    onSelectAlphabet: () => void,
    onSpeakGuidance: (text: string) => void,
    isSpeakingGuidance: boolean,
    speakingGuidanceText: string | null
}> = ({ levels, onSelectLevel, onSelectAlphabet, onSpeakGuidance, isSpeakingGuidance, speakingGuidanceText }) => {
    const guidanceText = "Selamat datang di Nihongo Master. Pilih level untuk mulai belajar, atau mulailah dengan alfabet jika Anda baru. Level yang terkunci akan terbuka setelah Anda menyelesaikan level sebelumnya.";
    const allCards = [ALPHABET_CARD, ...levels];
    
    return (
        <>
            <div className="flex justify-center items-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-300">Pilih Level Anda</h2>
                <HelpButton 
                    guidanceText={guidanceText}
                    onSpeak={onSpeakGuidance}
                    isSpeaking={isSpeakingGuidance}
                    speakingText={speakingGuidanceText}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {allCards.map(level => (
                    <div key={level.id}
                        onClick={() => level.id === 'ALPHABET' ? onSelectAlphabet() : onSelectLevel(level)}
                        className={`group relative rounded-2xl p-6 border border-white/10 bg-gray-800/50 backdrop-blur-sm shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-2 ${level.unlocked ? 'cursor-pointer hover:border-pink-400/50 hover:shadow-pink-500/10' : 'cursor-not-allowed'}`}
                    >
                        {!level.unlocked && <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center z-10"><Lock className="w-10 h-10 text-gray-500"/></div>}
                        <div className="flex justify-between items-start">
                            <div className={`text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-gray-200 to-gray-500 ${level.unlocked && 'group-hover:from-pink-400 group-hover:to-purple-500'}`}>{level.name}</div>
                            <div className="text-purple-400">{level.icon}</div>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-white">{level.title}</h3>
                        <p className="mt-1 text-sm text-gray-400 h-10">{level.description}</p>
                        <div className="mt-4 space-y-2 text-xs text-gray-300">
                           {level.id !== 'ALPHABET' ? (
                                <>
                                    <p>Kanji: ~{level.kanjiCount}</p>
                                    <p>Kosakata: ~{level.vocabCount}</p>
                                </>
                           ) : (
                                <p>Total Karakter: {level.vocabCount}</p>
                           )}
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-6">
                            <div className="bg-gradient-to-r from-pink-500 to-purple-600 h-2.5 rounded-full" style={{ width: `${level.progress}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
};

interface LevelViewProps {
    level: JlptLevel;
    onBack: () => void;
    onUnlockNextLevel: () => void;
    onSpeak: (text: string) => void;
    isSpeaking: boolean;
    speakingText: string | null;
    onSpeakGuidance: (text: string) => void;
    isSpeakingGuidance: boolean;
    speakingGuidanceText: string | null;
}

const TabContentHeader: React.FC<{
    title: string;
    guidanceText: string;
    onSpeakGuidance: (text: string) => void;
    isSpeakingGuidance: boolean;
    speakingGuidanceText: string | null;
}> = ({ title, guidanceText, onSpeakGuidance, isSpeakingGuidance, speakingGuidanceText }) => (
    <div className="flex items-center mb-4">
        <h3 className="text-2xl font-semibold text-gray-200">{title}</h3>
        <HelpButton 
            guidanceText={guidanceText}
            onSpeak={onSpeakGuidance}
            isSpeaking={isSpeakingGuidance}
            speakingText={speakingGuidanceText}
        />
    </div>
);

const AlphabetView: React.FC<{
    onBack: () => void;
    onSpeak: (text: string) => void;
    isSpeaking: boolean;
    speakingText: string | null;
    onStartPractice: (character: string) => void;
    onSpeakGuidance: (text: string) => void;
    isSpeakingGuidance: boolean;
    speakingGuidanceText: string | null;
}> = ({ onBack, onSpeak, isSpeaking, speakingText, onStartPractice, onSpeakGuidance, isSpeakingGuidance, speakingGuidanceText }) => {
    const [activeTab, setActiveTab] = useState('Hiragana');
    const tabs = ['Hiragana', 'Katakana'];
    const alphabetGuidanceText = "Ini adalah halaman untuk belajar alfabet Jepang. Pilih antara Hiragana atau Katakana, lalu klik sebuah karakter untuk berlatih menulisnya, atau klik ikon speaker untuk mendengar suaranya.";
    const tabGuidance = {
        Hiragana: "Hiragana digunakan untuk kata-kata asli Jepang, partikel tata bahasa, dan akhiran kata kerja. Ini adalah sistem penulisan pertama yang harus dipelajari.",
        Katakana: "Katakana digunakan untuk kata-kata serapan dari bahasa asing, nama asing, dan untuk penekanan. Karakternya lebih bersudut daripada Hiragana."
    };

    return (
        <div className="bg-gray-800/50 border border-white/10 rounded-2xl p-4 sm:p-8 shadow-2xl">
            <button onClick={onBack} className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft /> Kembali ke Dasbor
            </button>
            <div className="flex items-center mb-6">
                <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">Dasar-Dasar Alfabet</h2>
                <HelpButton 
                    guidanceText={alphabetGuidanceText}
                    onSpeak={onSpeakGuidance}
                    isSpeaking={isSpeakingGuidance}
                    speakingText={speakingGuidanceText}
                />
            </div>
            
            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab ? 'border-purple-400 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="py-6 min-h-[400px]">
                <TabContentHeader 
                    title={activeTab} 
                    guidanceText={tabGuidance[activeTab as keyof typeof tabGuidance]}
                    onSpeakGuidance={onSpeakGuidance}
                    isSpeakingGuidance={isSpeakingGuidance}
                    speakingGuidanceText={speakingGuidanceText}
                />
                {activeTab === 'Hiragana' && <ContentGrid items={HIRAGANA_CHARS} onSelect={onStartPractice} onSpeak={onSpeak} isSpeaking={isSpeaking} speakingText={speakingText} />}
                {activeTab === 'Katakana' && <ContentGrid items={KATAKANA_CHARS} onSelect={onStartPractice} onSpeak={onSpeak} isSpeaking={isSpeaking} speakingText={speakingText} />}
            </div>
        </div>
    );
};

const LevelView: React.FC<LevelViewProps> = ({ 
    level, 
    onBack, 
    onUnlockNextLevel, 
    onSpeak, 
    isSpeaking, 
    speakingText,
    onSpeakGuidance,
    isSpeakingGuidance,
    speakingGuidanceText 
}) => {
    const [activeTab, setActiveTab] = useState('Kanji');
    const content = MOCK_CONTENT[level.id as keyof typeof MOCK_CONTENT] || MOCK_CONTENT.N4;
    const ebookContent = MOCK_EBOOK_CONTENT[level.id as keyof typeof MOCK_EBOOK_CONTENT] || [];
    const tabs = ['Kanji', 'Kosakata', 'Tata Bahasa', 'Susun Kalimat', 'E-Book', 'Latihan AI'];
    
    const levelGuidanceText = `Ini adalah halaman belajar untuk level ${level.name}. Jelajahi kanji, kosakata, tata bahasa, baca e-book, atau berlatih percakapan dengan AI menggunakan tab di bawah.`;
    const tabGuidance = {
        Kanji: "Di sini Anda dapat melihat dan mendengarkan pengucapan karakter Kanji untuk level ini. Klik pada sebuah karakter untuk mendengarnya.",
        Kosakata: "Pelajari daftar kosakata penting untuk level ini. Klik ikon speaker untuk mendengarkan pengucapannya.",
        'Tata Bahasa': "Pahami pola tata bahasa kunci yang akan Anda gunakan di level ini. Klik ikon speaker untuk mendengarkan contoh kalimat.",
        'Susun Kalimat': "Latih pemahaman tata bahasa Anda. Baca arti kalimatnya, lalu klik kata-kata Jepang yang diacak untuk menyusunnya. Jika Anda kesulitan, gunakan tombol 'Minta Bantuan' untuk mendapatkan petunjuk kata berikutnya.",
        'E-Book': "Baca materi pembelajaran mendalam. Pilih bab dari daftar isi di sebelah kiri untuk mulai membaca.",
        'Latihan AI': "Berlatih percakapan dengan AI. Pilih skenario, mulai, dan balas pesannya dalam bahasa Jepang atau Indonesia."
    };

    return (
        <div className="bg-gray-800/50 border border-white/10 rounded-2xl p-4 sm:p-8 shadow-2xl">
            <button onClick={onBack} className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft /> Kembali ke Dasbor
            </button>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <div className="flex items-center">
                        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">{level.name}: {level.title}</h2>
                        <HelpButton 
                            guidanceText={levelGuidanceText}
                            onSpeak={onSpeakGuidance}
                            isSpeaking={isSpeakingGuidance}
                            speakingText={speakingGuidanceText}
                        />
                    </div>
                    <p className="text-gray-400 mt-1">{level.description}</p>
                </div>
                 {level.progress < 100 && (
                     <button onClick={onUnlockNextLevel} className="mt-4 md:mt-0 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:scale-105 transition-transform">
                         Ambil Tes Diagnostik
                     </button>
                 )}
            </div>

            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab ? 'border-purple-400 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="py-6 min-h-[400px]">
                <TabContentHeader 
                    title={activeTab} 
                    guidanceText={tabGuidance[activeTab as keyof typeof tabGuidance]}
                    onSpeakGuidance={onSpeakGuidance}
                    isSpeakingGuidance={isSpeakingGuidance}
                    speakingGuidanceText={speakingGuidanceText}
                />
                {activeTab === 'Kanji' && <ContentGrid items={content.kanji} onSelect={(item) => onSpeak(item)} onSpeak={onSpeak} isSpeaking={isSpeaking} speakingText={speakingText} />}
                {activeTab === 'Kosakata' && <ContentList items={content.vocab} onSpeak={onSpeak} isSpeaking={isSpeaking} speakingText={speakingText} />}
                {activeTab === 'Tata Bahasa' && <ContentList items={content.grammar} onSpeak={onSpeak} isSpeaking={isSpeaking} speakingText={speakingText} />}
                {activeTab === 'Susun Kalimat' && <SentenceBuilder sentences={content.sentences} />}
                {activeTab === 'E-Book' && <EbookReader content={ebookContent} onSpeak={onSpeak} isSpeaking={isSpeaking} speakingText={speakingText} />}
                {activeTab === 'Latihan AI' && <AiRoleplay level={level} scenarios={content.scenarios} onSpeak={onSpeak} isSpeaking={isSpeaking} speakingText={speakingText} />}
            </div>
        </div>
    );
};

const WritingPracticeView: React.FC<{
    character: string;
    onBack: () => void;
    onSpeakGuidance: (text: string) => void;
    isSpeakingGuidance: boolean;
    speakingGuidanceText: string | null;
}> = ({ character, onBack, onSpeakGuidance, isSpeakingGuidance, speakingGuidanceText }) => {
    const canvasRef = useRef<{ clearCanvas: () => void }>(null);
    const guidanceText = "Ini adalah mode latihan menulis. Lihat panduan urutan goresan di sebelah kiri. Gunakan mouse atau jari Anda untuk menulis karakter di kanvas sebelah kanan. Klik 'Bersihkan' untuk mencoba lagi.";
    const strokeGuide = STROKE_ORDER_GUIDES[character];

    return (
        <div className="bg-gray-800/50 border border-white/10 rounded-2xl p-4 sm:p-8 shadow-2xl">
            <button onClick={onBack} className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft /> Kembali ke Alfabet
            </button>
            <div className="flex items-center mb-6">
                <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">Latihan Menulis: {character}</h2>
                <HelpButton
                    guidanceText={guidanceText}
                    onSpeak={onSpeakGuidance}
                    isSpeaking={isSpeakingGuidance}
                    speakingText={speakingGuidanceText}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-300">Panduan Goresan</h3>
                    <div className="aspect-square bg-gray-900 rounded-lg p-4 text-white">
                        {strokeGuide ? strokeGuide : <p className="text-center text-gray-500 h-full flex items-center justify-center">Panduan untuk karakter ini belum tersedia.</p>}
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold text-gray-300">Kanvas Latihan</h3>
                        <button 
                            onClick={() => canvasRef.current?.clearCanvas()}
                            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-1 rounded-lg transition-colors text-sm"
                        >
                            Bersihkan
                        </button>
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-700">
                        <DrawingCanvas ref={canvasRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const DrawingCanvas = React.forwardRef<
    { clearCanvas: () => void }
>((props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const setCanvasDimensions = () => {
          const { width, height } = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          const context = canvas.getContext("2d");
          if (!context) return;
          context.scale(dpr, dpr);
          context.lineCap = "round";
          context.strokeStyle = "#FFFFFF";
          context.lineWidth = 6;
          contextRef.current = context;
        }
        setCanvasDimensions();
        // Optional: you can add a resize listener here if the canvas can change size
    }, []);

    useImperativeHandle(ref, () => ({
        clearCanvas() {
            const canvas = canvasRef.current;
            const context = contextRef.current;
            if (canvas && context) {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }));
    
    const getCoords = (e: MouseEvent | TouchEvent): {x: number, y: number} | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            if (e.touches.length === 0) return null;
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const coords = getCoords(e.nativeEvent);
        if (!coords || !contextRef.current) return;
        contextRef.current.beginPath();
        contextRef.current.moveTo(coords.x, coords.y);
        setIsDrawing(true);
    };

    const finishDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!contextRef.current) return;
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing) return;
        const coords = getCoords(e.nativeEvent);
        if (!coords || !contextRef.current) return;
        contextRef.current.lineTo(coords.x, coords.y);
        contextRef.current.stroke();
    };

    return <canvas 
        ref={canvasRef} 
        onMouseDown={startDrawing} 
        onMouseUp={finishDrawing} 
        onMouseMove={draw} 
        onMouseLeave={finishDrawing}
        onTouchStart={startDrawing}
        onTouchEnd={finishDrawing}
        onTouchMove={draw}
        className="w-full h-full bg-gray-900 cursor-crosshair" 
    />;
});


interface ContentGridProps {
    items: string[];
    onSelect: (item: string) => void;
    onSpeak: (text: string) => void;
    isSpeaking: boolean;
    speakingText: string | null;
}

const ContentGrid: React.FC<ContentGridProps> = ({items, onSelect, onSpeak, isSpeaking, speakingText}) => (
    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
        {items.map((item, i) => {
            const isCurrentlySpeaking = isSpeaking && speakingText === item;
            return (
                 <div key={i} className="relative group bg-gray-900 aspect-square rounded-lg transition-all duration-200 hover:bg-gray-700 focus-within:ring-2 focus-within:ring-purple-500 hover:-translate-y-1">
                    <button 
                        onClick={() => onSelect(item)} 
                        aria-label={`Berlatih menulis ${item}`}
                        className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold"
                    >
                        {item}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onSpeak(item); }}
                        disabled={isSpeaking}
                        aria-label={`Ucapkan ${item}`}
                        className="absolute bottom-1 right-1 text-gray-500 hover:text-white p-1 rounded-full hover:bg-gray-800/50 transition-all opacity-50 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 disabled:cursor-wait"
                    >
                       {isCurrentlySpeaking ? <Spinner className="w-4 h-4" /> : <SpeakerIcon className="w-4 h-4"/>}
                    </button>
                </div>
            )
        })}
    </div>
);

const ContentList: React.FC<{
    items: string[];
    onSpeak: (text: string) => void;
    isSpeaking: boolean;
    speakingText: string | null;
}> = ({items, onSpeak, isSpeaking, speakingText}) => {
    return (
     <ul className="space-y-3">
        {items.map((item, i) => {
             const isCurrentlySpeaking = isSpeaking && speakingText === item;
             return (
                 <li key={i} className="bg-gray-900 p-4 rounded-lg text-gray-300 flex justify-between items-center">
                    <span>{item}</span>
                    <button 
                        onClick={() => onSpeak(item)}
                        disabled={isSpeaking}
                        aria-label={`Ucapkan ${item}`} 
                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isCurrentlySpeaking ? <Spinner /> : <SpeakerIcon className="w-5 h-5"/>}
                    </button>
                </li>
             )
        })}
    </ul>
    );
};

const SentenceBuilder: React.FC<{ sentences: { ja: string; id: string }[] }> = ({ sentences }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [charBank, setCharBank] = useState<string[]>([]);
    const [userSentence, setUserSentence] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<{ message: string; type: 'correct' | 'incorrect' | 'info' } | null>(null);

    // Splits the sentence into individual characters.
    const splitSentenceToChars = (sentence: string) => sentence.split('');

    const setupSentence = useCallback((index: number) => {
        const current = sentences[index];
        const chars = splitSentenceToChars(current.ja);
        setCharBank(chars.sort(() => Math.random() - 0.5));
        setUserSentence([]);
        setFeedback(null);
    }, [sentences]);

    useEffect(() => {
        if (sentences && sentences.length > 0) {
            setupSentence(currentIndex);
        }
    }, [currentIndex, sentences, setupSentence]);

    const handleCharBankClick = (char: string, index: number) => {
        const newCharBank = [...charBank];
        newCharBank.splice(index, 1);
        setCharBank(newCharBank);
        setUserSentence(prev => [...prev, char]);
        setFeedback(null);
    };

    const handleUserSentenceClick = (char: string, index: number) => {
        const newSentence = [...userSentence];
        newSentence.splice(index, 1);
        setUserSentence(newSentence);
        setCharBank(prev => [...prev, char]);
        setFeedback(null);
    };

    const handleCheck = () => {
        const constructedSentence = userSentence.join('');
        const correctSentence = sentences[currentIndex].ja;
        if (constructedSentence === correctSentence) {
            setFeedback({ message: "Benar! Kerja bagus!", type: 'correct' });
        } else {
            setFeedback({ message: "Belum tepat. Coba lagi atau gunakan bantuan!", type: 'incorrect' });
        }
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev + 1) % sentences.length);
    };

    const handleHint = () => {
        const correctChars = splitSentenceToChars(sentences[currentIndex].ja);
        const nextCorrectChar = correctChars[userSentence.length];
        
        if (nextCorrectChar) {
            const indexInBank = charBank.indexOf(nextCorrectChar);
            if (indexInBank > -1) {
                handleCharBankClick(nextCorrectChar, indexInBank);
            }
        }
    }
    
    if (!sentences || sentences.length === 0) {
        return <div className="text-center text-gray-500">Latihan menyusun kalimat untuk level ini akan segera hadir.</div>;
    }
    
    const currentChallenge = sentences[currentIndex];
    const isHintDisabled = userSentence.length >= splitSentenceToChars(currentChallenge.ja).length || feedback?.type === 'correct';

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto">
            <div className="text-center">
                <p className="text-gray-400 mb-1">Susun kalimat untuk arti berikut:</p>
                <p className="text-xl font-semibold text-white">{currentChallenge.id}</p>
            </div>
            
            <div className={`w-full min-h-[6rem] bg-gray-900 rounded-lg border-2 p-4 flex flex-wrap gap-2 items-center justify-center transition-colors
                ${feedback?.type === 'correct' ? 'border-green-500' : ''}
                ${feedback?.type === 'incorrect' ? 'border-red-500' : ''}
                ${!feedback ? 'border-gray-700' : ''}
            `}>
                {userSentence.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center items-center">
                    {userSentence.map((char, index) => (
                        <button key={index} onClick={() => handleUserSentenceClick(char, index)} className="bg-purple-600 text-white font-bold py-2 px-3 rounded-lg text-lg transition-transform hover:scale-105">
                            {char}
                        </button>
                    ))}
                    </div>
                ) : (
                    <span className="text-gray-500">Klik karakter di bawah untuk memulai</span>
                )}
            </div>
            
            <div className="w-full min-h-[6rem] p-4 flex flex-wrap gap-2 items-center justify-center">
                 {charBank.map((char, index) => (
                    <button key={index} onClick={() => handleCharBankClick(char, index)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-lg text-lg transition-transform hover:scale-105">
                        {char}
                    </button>
                ))}
            </div>

            {feedback && <p className={`font-semibold ${feedback.type === 'correct' ? 'text-green-400' : 'text-red-400'}`}>{feedback.message}</p>}

            <div className="flex gap-4 mt-4">
                <button 
                    onClick={handleHint} 
                    disabled={isHintDisabled}
                    className="bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Minta Bantuan"
                >
                    <Lightbulb className="w-5 h-5" />
                </button>
                <button onClick={() => setupSentence(currentIndex)} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                    Reset
                </button>
                {feedback?.type === 'correct' ? (
                     <button onClick={handleNext} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:scale-105 transition-transform">
                        Berikutnya
                    </button>
                ) : (
                    <button onClick={handleCheck} disabled={charBank.length > 0} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Periksa
                    </button>
                )}
            </div>
        </div>
    );
};


interface EbookProps {
    content: EbookChapter[];
    onSpeak: (text: string) => void;
    isSpeaking: boolean;
    speakingText: string | null;
}

const EbookReader: React.FC<EbookProps> = ({ content, onSpeak, isSpeaking, speakingText }) => {
    const [selectedChapter, setSelectedChapter] = useState(0);

    if (!content || content.length === 0) {
        return <div className="text-center text-gray-500">Materi E-Book untuk level ini akan segera hadir.</div>;
    }
    
    const chapter = content[selectedChapter];

    return (
        <div className="flex flex-col md:flex-row gap-8">
            <aside className="md:w-1/4">
                <h3 className="text-lg font-semibold text-purple-400 mb-4">Daftar Isi</h3>
                <ul className="space-y-2">
                    {content.map((chap, index) => (
                        <li key={index}>
                            <button 
                                onClick={() => setSelectedChapter(index)}
                                className={`w-full text-left p-2 rounded-md transition-colors text-sm ${selectedChapter === index ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
                            >
                                {chap.title}
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>
            <article className="md:w-3/4 bg-gray-900/50 p-6 rounded-lg max-h-[60vh] overflow-y-auto">
                <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">{chapter.title}</h1>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    {chapter.content.map((item, index) => {
                        if (item.type === 'h2') return <h2 key={index} className="text-2xl font-semibold text-gray-100 mt-6 border-b border-gray-700 pb-2">{item.text}</h2>
                        if (item.type === 'p') return <p key={index}>{item.text}</p>
                        if (item.type === 'example') {
                            const isCurrentlySpeaking = isSpeaking && speakingText === item.text;
                            return (
                                <div key={index} className="bg-gray-800 p-4 rounded-md flex justify-between items-center my-2">
                                    <span className="italic">{item.text}</span>
                                    <button 
                                        onClick={() => onSpeak(item.text)}
                                        disabled={isSpeaking}
                                        aria-label={`Ucapkan ${item.text}`} 
                                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {isCurrentlySpeaking ? <Spinner /> : <SpeakerIcon className="w-5 h-5"/>}
                                    </button>
                                </div>
                            )
                        }
                        return null;
                    })}
                </div>
            </article>
        </div>
    )
}

interface AiRoleplayProps {
    level: JlptLevel;
    scenarios: string[];
    onSpeak: (text: string) => void;
    isSpeaking: boolean;
    speakingText: string | null;
}

const AiRoleplay: React.FC<AiRoleplayProps> = ({ level, scenarios, onSpeak, isSpeaking, speakingText }) => {
    const [selectedScenario, setSelectedScenario] = useState(scenarios[0]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);


    const handleStartScenario = useCallback(() => {
        setChatHistory([
            { role: 'model', parts: `Baik, mari kita mulai skenario "${selectedScenario}" untuk level ${level.name}. Saya akan mulai.\n\nこんにちは！ご注文は？\n(Halo! Apa pesanan Anda?)` }
        ]);
        setUserInput('');
    }, [selectedScenario, level.name]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', parts: userInput }];
        setChatHistory(newHistory);
        setUserInput('');
        setIsLoading(true);

        try {
            const response = await getAiRoleplayResponse(level.id, selectedScenario, newHistory);
            setChatHistory([...newHistory, { role: 'model', parts: response }]);
        } catch (error) {
            console.error(error);
            setChatHistory([...newHistory, { role: 'model', parts: "Maaf, terjadi kesalahan. Silakan coba lagi." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-4 mb-4">
                <select 
                    value={selectedScenario} 
                    onChange={e => setSelectedScenario(e.target.value)}
                    className="bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500"
                >
                    {scenarios.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button 
                    onClick={handleStartScenario}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    Mulai Skenario
                </button>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto flex flex-col gap-4">
                {chatHistory.map((msg, index) => {
                    const isCurrentlySpeaking = isSpeaking && speakingText === msg.parts;
                    return (
                        <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`group flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                 <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                    <p className="whitespace-pre-wrap">{msg.parts}</p>
                                </div>
                                <button 
                                    onClick={() => onSpeak(msg.parts)}
                                    disabled={isSpeaking} 
                                    aria-label="Ucapkan pesan" 
                                    className="text-gray-500 hover:text-white p-1 rounded-full transition-opacity mb-1 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-100 disabled:cursor-wait"
                                >
                                    {isCurrentlySpeaking ? <Spinner /> : <SpeakerIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-700 text-gray-200 rounded-2xl px-4 py-2 rounded-bl-none flex items-center">
                            <Spinner /> <span className="ml-2">Berpikir...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={`Balas dalam bahasa Jepang atau Indonesia...`}
                    className="flex-grow bg-gray-900 border border-gray-600 rounded-lg py-3 px-4 text-white focus:ring-purple-500 focus:border-purple-500 transition"
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !userInput.trim()}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Kirim
                </button>
            </form>
        </div>
    );
};

export default App;