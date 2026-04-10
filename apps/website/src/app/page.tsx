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

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <CursorGlow />
      <Navbar />
      <Hero />
      <NextEvent />
      <Gallery />
      <DJResidents />
      <About />
      <Location />
      <Contact />
      <Footer />
    </>
  );
}
