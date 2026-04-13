"use client";

import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { CursorGlow } from "@/components/ui/CursorGlow";
import { Hero } from "@/components/Hero";
import { NextEvent } from "@/components/NextEvent";
import { Gallery } from "@/components/Gallery";
import { DJResidents } from "@/components/DJResidents";
import { About } from "@/components/About";
import { Location } from "@/components/Location";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { Preloader } from "@/components/Preloader";

export function HomeClient() {
  const [preloaderDone, setPreloaderDone] = useState(false);

  const handlePreloaderComplete = useCallback(() => {
    setPreloaderDone(true);
  }, []);

  return (
    <>
      <Preloader onComplete={handlePreloaderComplete} />
      <ScrollProgress />
      <CursorGlow />
      <Navbar />
      <main id="main-content">
        <Hero ready={preloaderDone} />
        <NextEvent />
        <Gallery />
        <DJResidents />
        <About />
        <Location />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
