import AnnouncementBar from '@/components/AnnouncementBar';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ComparisonBlock from '@/components/ComparisonBlock';
import VolumeOffers from '@/components/VolumeOffers';
import Reviews from '@/components/Reviews';
import CrossSell from '@/components/CrossSell';
import Cart from '@/components/Cart';

export default function Store() {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full overflow-x-hidden bg-background">
      <AnnouncementBar />
      <Header />
      <main className="flex-1 w-full mx-auto pb-20">
        <HeroSection />
        <ComparisonBlock />
        <VolumeOffers />
        <Reviews />
        <CrossSell />
      </main>
      <Cart />
    </div>
  );
}
