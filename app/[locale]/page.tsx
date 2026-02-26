'use client';

import { useState } from 'react';
import UploadStep from '@/components/UploadStep';
import CropStep from '@/components/CropStep';
import GenerateStep from '@/components/GenerateStep';
import ResultStep from '@/components/ResultStep';

type Step = 'upload' | 'crop' | 'generate' | 'result';

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [resultBase64, setResultBase64] = useState<string | null>(null);

  return (
    <main className="py-6 px-4">
      {step === 'upload' && (
        <UploadStep
          onFileSelected={(file) => {
            setOriginalFile(file);
            setStep('crop');
          }}
        />
      )}

      {step === 'crop' && originalFile && (
        <CropStep
          file={originalFile}
          onCropped={(blob) => {
            setCroppedBlob(blob);
            setStep('generate');
          }}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'generate' && croppedBlob && (
        <GenerateStep
          croppedBlob={croppedBlob}
          onResult={(base64) => {
            setResultBase64(base64);
            setStep('result');
          }}
          onBack={() => setStep('crop')}
        />
      )}

      {step === 'result' && resultBase64 && (
        <ResultStep
          imageBase64={resultBase64}
          onRegenerate={() => setStep('generate')}
          onNewSession={() => {
            setOriginalFile(null);
            setCroppedBlob(null);
            setResultBase64(null);
            setStep('upload');
          }}
        />
      )}
    </main>
  );
}
