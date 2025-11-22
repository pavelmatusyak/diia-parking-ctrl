import React, { createContext, useContext, useMemo, useState } from 'react';

type ViolationContextValue = {
  platePhoto: string | null;
  widePhoto: string | null;
  signsPhotos: string[];
  selectedSigns: string[];
  violationReason: string | null;
  confirmPhoto: string | null;
  setPlatePhoto: (uri: string | null) => void;
  setWidePhoto: (uri: string | null) => void;
  setSelectedSigns: (signIds: string[]) => void;
  addSignPhoto: (uri: string) => void;
  setViolationReason: (reason: string | null) => void;
  setConfirmPhoto: (uri: string | null) => void;
  resetAll: () => void;
};

const ViolationContext = createContext<ViolationContextValue | undefined>(undefined);

const initialSignsPhotos: string[] = [];

export const ViolationContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [platePhoto, setPlatePhoto] = useState<string | null>(null);
  const [widePhoto, setWidePhoto] = useState<string | null>(null);
  const [signsPhotos, setSignsPhotos] = useState<string[]>(initialSignsPhotos);
  const [selectedSigns, setSelectedSigns] = useState<string[]>([]);
  const [violationReason, setViolationReason] = useState<string | null>(null);
  const [confirmPhoto, setConfirmPhoto] = useState<string | null>(null);

  const resetAll = () => {
    setPlatePhoto(null);
    setWidePhoto(null);
    setSignsPhotos(initialSignsPhotos);
    setSelectedSigns([]);
    setViolationReason(null);
    setConfirmPhoto(null);
  };

  const addSignPhoto = (uri: string) => {
    setSignsPhotos((prev) => [...prev, uri]);
  };

  const value = useMemo(
    () => ({
      platePhoto,
      widePhoto,
      signsPhotos,
      selectedSigns,
      violationReason,
      confirmPhoto,
      setPlatePhoto,
      setWidePhoto,
      setSelectedSigns,
      addSignPhoto,
      setViolationReason,
      setConfirmPhoto,
      resetAll,
    }),
    [platePhoto, widePhoto, signsPhotos, selectedSigns, violationReason, confirmPhoto]
  );

  return <ViolationContext.Provider value={value}>{children}</ViolationContext.Provider>;
};

export const useViolationContext = () => {
  const ctx = useContext(ViolationContext);
  if (!ctx) {
    throw new Error('useViolationContext must be used inside ViolationContextProvider');
  }
  return ctx;
};

