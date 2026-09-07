import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Droplets, Sun, Award, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CAROUSEL_SLIDES = [
  {
    id: 'slide-1',
    image: '/images/jharkhand_jal_sahiya_village.jpg',
    tag_en: 'Jal Jeevan Mission • Jharkhand',
    tag_hi: 'जल जीवन मिशन • झारखण्ड',
    title_en: 'Clean & Safe Drinking Water for Every Household',
    title_hi: 'हर घर नल से शुद्ध एवं सुरक्षित पेयजल',
    desc_en: 'Solar-powered community water kiosks operated by dedicated village Jal Sahiya caretakers.',
    desc_hi: 'गाँव-गाँव में सौर ऊर्जा चलित वाटर कियोस्क एवं समर्पित जल सहिया दीदी द्वारा संचालन।'
  },
  {
    id: 'slide-2',
    image: '/images/jharkhand_reservoir_dam.jpg',
    tag_en: 'Sustainable Infrastructure',
    tag_hi: 'सतत जल अवसंरचना',
    title_en: 'Solar-Powered Water Reservoirs & Membrane Plants',
    title_hi: 'सौर संचालित जल भंडारण एवं आधुनिक शोधन संयंत्र',
    desc_en: 'Eco-friendly water harvesting and purification across the Chota Nagpur Plateau with zero carbon footprint.',
    desc_hi: 'छोटानागपुर पठार में पर्यावरण अनुकूल जल संचयन एवं शून्य कार्बन उत्सर्जन के साथ निरंतर शुद्धि।'
  },
  {
    id: 'slide-3',
    image: '/images/jharkhand_water_plant.jpg',
    tag_en: 'Smart IoT Automation',
    tag_hi: 'स्मार्ट IoT स्वचालन',
    title_en: 'Autonomous Multi-Barrier Filtration & Quality Monitoring',
    title_hi: 'स्वचालित मल्टी-स्टेज फ़िल्ट्रेशन एवं गुणवत्ता निगरानी',
    desc_en: 'Dual-stream IoT sensors continuously monitoring raw inlet vs purified drinking outlet water.',
    desc_hi: 'कच्चे पानी और शुद्ध पानी की 24x7 रियल-टाइम सेंसर आधारित निरंतर निगरानी।'
  },
  {
    id: 'slide-4',
    image: '/images/iot_water_sensor_lab.jpg',
    tag_en: 'BIS 10500:2012 Certified',
    tag_hi: 'BIS 10500:2012 प्रमाणित',
    title_en: 'Real-Time Laboratory Standard Quality Assurance',
    title_hi: 'प्रयोगशाला स्तर की वास्तविक समय गुणवत्ता परख',
    desc_en: 'Instant automated drift detection and threshold checking before water reaches the consumer.',
    desc_hi: 'पानी नल तक पहुँचने से पहले TDS, pH एवं गंदलापन की कठोर स्वचालित जांच।'
  }
];

export default function HeroCarousel() {
  const { lang } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-roll every 5 seconds
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? CAROUSEL_SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  return (
    <div 
      className="hero-carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: '380px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        backgroundColor: '#0F172A',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Slides */}
      {CAROUSEL_SLIDES.map((slide, index) => {
        const isActive = index === currentSlide;
        return (
          <div
            key={slide.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: isActive ? 1 : 0,
              visibility: isActive ? 'visible' : 'hidden',
              transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out',
              transform: isActive ? 'scale(1)' : 'scale(1.04)'
            }}
          >
            {/* Background Photo with Gradient Dark Overlay for Crisp Text Readability */}
            <img
              src={slide.image}
              alt={slide.title_en}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'brightness(0.85)'
              }}
            />

            {/* Gradient Overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.85) 100%)'
            }} />

            {/* Slide Content Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '36px',
              left: '32px',
              right: '32px',
              color: '#FFFFFF',
              zIndex: 10
            }}>
              {/* Tag Pill */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#FFD54F',
                border: '1px solid rgba(255, 213, 79, 0.4)',
                marginBottom: 10
              }}>
                <Sparkles size={13} />
                <span>{lang === 'en' ? slide.tag_en : slide.tag_hi}</span>
              </div>

              {/* Title */}
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                lineHeight: 1.2,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                marginBottom: 6,
                textShadow: '0 2px 8px rgba(0,0,0,0.5)'
              }}>
                {lang === 'en' ? slide.title_en : slide.title_hi}
              </h2>

              {/* Description */}
              <p style={{
                fontSize: '0.92rem',
                color: '#E2E8F0',
                maxWidth: '680px',
                fontWeight: 500,
                lineHeight: 1.4,
                textShadow: '0 1px 4px rgba(0,0,0,0.6)'
              }}>
                {lang === 'en' ? slide.desc_en : slide.desc_hi}
              </p>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        style={{
          position: 'absolute',
          top: '50%',
          left: '16px',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          transition: 'all 0.2s'
        }}
        title="Previous Photo"
      >
        <ChevronLeft size={22} />
      </button>

      <button
        onClick={nextSlide}
        style={{
          position: 'absolute',
          top: '50%',
          right: '16px',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          transition: 'all 0.2s'
        }}
        title="Next Photo"
      >
        <ChevronRight size={22} />
      </button>

      {/* Slide Indicator Dots (Roll Effect) */}
      <div style={{
        position: 'absolute',
        bottom: '14px',
        right: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 20
      }}>
        {CAROUSEL_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            style={{
              width: currentSlide === idx ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: currentSlide === idx ? '#FFD54F' : 'rgba(255, 255, 255, 0.4)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        ))}
      </div>
    </div>
  );
}
