import { ScrollProvider } from "@/lib/scroll";
import SceneLoader from "@/three/SceneLoader";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import ScrollProgress from "@/components/layout/ScrollProgress";
import Cursor from "@/components/layout/Cursor";
import Preloader from "@/components/layout/Preloader";
import Grain from "@/components/layout/Grain";
import Hud from "@/components/layout/Hud";
import Hero from "@/components/sections/Hero";
import EngineRail from "@/components/sections/EngineRail";
import Platform from "@/components/sections/Platform";
import HowItWorks from "@/components/sections/HowItWorks";
import Apps from "@/components/sections/Apps";
import Download from "@/components/sections/Download";
import Languages from "@/components/sections/Languages";
import Pricing from "@/components/sections/Pricing";
import Cta from "@/components/sections/Cta";

export default function Page() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] btn-primary">Skip to content</a>
      <ScrollProvider />
      <SceneLoader />
      <Grain />
      <Preloader />
      <Cursor />
      <ScrollProgress />
      <Hud />
      <Nav />
      <main id="main" className="relative z-10">
        <Hero />
        <EngineRail />
        <Platform />
        <HowItWorks />
        <Apps />
        <Download />
        <Languages />
        <Pricing />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
