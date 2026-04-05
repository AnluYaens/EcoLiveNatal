'use client';

import { useState } from 'react';
import UploadStep from '@/components/UploadStep';
import CropStep from '@/components/CropStep';
import GenerateStep from '@/components/GenerateStep';
import ResultStep from '@/components/ResultStep';
import TokenGate, { SESSION_KEY } from '@/components/TokenGate';
import StepProgress from '@/components/StepProgress';
import type { AnatomicalRegion } from '@/lib/validation';

type Step = 'upload' | 'crop' | 'generate' | 'result';

export default function Home() {
  const [tokenVerified, setTokenVerified] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!sessionStorage.getItem(SESSION_KEY);
    }
    return false;
  });
  const [step, setStep] = useState<Step>('upload');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [anatomicalRegion, setAnatomicalRegion] = useState<AnatomicalRegion>('face');

  if (!tokenVerified) {
    return <TokenGate onVerified={() => setTokenVerified(true)} />;
  }

  return (
    <>
      <main className="w-full max-w-sm mx-auto px-5 pt-6 pb-20 space-y-6">
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
            anatomicalRegion={anatomicalRegion}
            onAnatomicalRegionChange={setAnatomicalRegion}
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
            anatomicalRegion={anatomicalRegion}
            onAnatomicalRegionChange={setAnatomicalRegion}
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
            sourceBlob={croppedBlob}
            onRegenerate={() => setStep('generate')}
            onNewSession={() => {
              setOriginalFile(null);
              setCroppedBlob(null);
              setResultBase64(null);
              setAnatomicalRegion('face');
              setStep('upload');
            }}
          />
        )}
      </main>

      <StepProgress currentStep={step} />
    </>
  );
}
