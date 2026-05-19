const fs = require('fs');

const importsToAdd = `
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Dog, Camera, Download } from 'lucide-react';
import { Button } from './ui/button';
import L from 'leaflet';
import { supabase } from '../supabase';
`;

const propsInterface = `
export interface WalkScreenProps {
  walkState: string;
  formatTime: (sec: number) => string;
  currentLocation: [number, number] | null;
  walkPath: { lat: number, lng: number }[];
  handleStopWalk: () => void;
  walkMarkers: { type: string, lat: number, lng: number }[];
  selectedWalkPets: string[];
  userPets: any[];
  toggleWalkPetSelection: (id: string) => void;
  handleStartWalk: () => void;
  generatedWalkImage: string | null;
  generateSummaryImage: () => Promise<string | null>;
  walkSummary: any;
  user: any;
  setIsGeneratingImage: (val: boolean) => void;
  generateId: () => string;
  ownerProfile: any;
  setPosts: (val: any) => void;
  resetWalkState: () => void;
  setView: (val: string) => void;
  isGeneratingImage: boolean;
  handleDownloadWalkImage: () => void;
}
`;

let content = fs.readFileSync('src/screens/WalkScreen.tsx', 'utf8');

// Insert imports
content = content.replace("import React from 'react';", "import React from 'react';" + importsToAdd);

// Insert interface and props
content = content.replace("export function WalkScreen(props: any) {\n  const { } = props;", propsInterface + "\nexport function WalkScreen(props: WalkScreenProps) {\n  const { walkState, formatTime, currentLocation, walkPath, handleStopWalk, walkMarkers, selectedWalkPets, userPets, toggleWalkPetSelection, handleStartWalk, generatedWalkImage, generateSummaryImage, walkSummary, user, setIsGeneratingImage, generateId, ownerProfile, setPosts, resetWalkState, setView, isGeneratingImage, handleDownloadWalkImage } = props;");

fs.writeFileSync('src/screens/WalkScreen.tsx', content);
console.log("WalkScreen.tsx updated with props and imports");
