import React from 'react';

export interface JlptLevel {
  id: string;
  name: string;
  title: string;
  description: string;
  kanjiCount: number;
  vocabCount: number;
  progress: number;
  unlocked: boolean;
  icon: React.ReactElement;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: string;
}

export interface EbookContentItem {
  type: 'h2' | 'p' | 'example';
  text: string;
}

export interface EbookChapter {
  title: string;
  content: EbookContentItem[];
}
