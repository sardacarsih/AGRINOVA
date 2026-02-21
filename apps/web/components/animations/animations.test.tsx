import React from 'react';
import { render, screen } from '@testing-library/react';
import { ElectricBorder, LightningBackground, SplashCursor } from './index';

describe('Animation Components', () => {
  test('ElectricBorder renders children', () => {
    render(
      <ElectricBorder>
        <div>Test Content</div>
      </ElectricBorder>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('LightningBackground renders children', () => {
    render(
      <LightningBackground>
        <div>Test Content</div>
      </LightningBackground>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('SplashCursor renders children', () => {
    render(
      <SplashCursor>
        <div>Test Content</div>
      </SplashCursor>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});