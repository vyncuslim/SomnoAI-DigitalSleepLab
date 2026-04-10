import React from 'react';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import Features from '../components/Features';
import Ecosystem from '../components/Ecosystem';
import Audience from '../components/Audience';
import Testimonials from '../components/Testimonials';
import Newsletter from '../components/Newsletter';

const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto">
      <Hero />
      <Stats />
      <Features />
      <Ecosystem />
      <Audience />
      <Testimonials />
      <Newsletter />
    </div>
  );
};

export default HomePage;
