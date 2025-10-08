import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AnimatedPage,
  AnimatedSection,
  AnimatedList,
  AnimatedListItem,
  AnimatedCard,
  AnimatedButton,
  AnimatedModal,
} from '@/components/AnimatedPage';
import {
  fadeIn,
  fadeInUp,
  fadeInLeft,
  fadeInRight,
  scaleInSpring,
  slideInBottom,
  pulse,
  wiggle,
  shake,
  buttonHover,
  buttonTap,
  cardHover,
  staggerContainer,
  staggerItem,
} from '@/utils/animations';
import { useAnimation, useScrollAnimation, useHoverAnimation } from '@/hooks/useAnimation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Zap,
  Heart,
  Star,
  Rocket,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

/**
 * Animation examples and showcase
 */
export default function AnimationsExample() {
  const [showModal, setShowModal] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Animation controls
  const { play: playPulse, controls: pulseControls } = useAnimation({ loop: true });
  const { ref: scrollRef, isInView } = useScrollAnimation(0.2);
  const { isHovered, hoverProps } = useHoverAnimation();

  return (
    <AnimatedPage>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          className="space-y-2"
        >
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Animation & Micro-interactions
          </h1>
          <p className="text-lg text-muted-foreground">
            Smooth, delightful animations powered by Framer Motion
          </p>
        </motion.div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Basic Animations</TabsTrigger>
            <TabsTrigger value="interactions">Micro-interactions</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Animations */}
          <TabsContent value="basic" className="space-y-6">
            {/* Fade Animations */}
            <Card>
              <CardHeader>
                <CardTitle>Fade Animations</CardTitle>
                <CardDescription>Smooth fade-in effects from different directions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeIn}
                    className="p-4 border rounded-lg text-center"
                  >
                    <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">Fade In</p>
                  </motion.div>

                  <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeInUp}
                    className="p-4 border rounded-lg text-center"
                  >
                    <Heart className="h-8 w-8 mx-auto mb-2 text-red-500" />
                    <p className="text-sm font-medium">Fade In Up</p>
                  </motion.div>

                  <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeInLeft}
                    className="p-4 border rounded-lg text-center"
                  >
                    <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    <p className="text-sm font-medium">Fade In Left</p>
                  </motion.div>

                  <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeInRight}
                    className="p-4 border rounded-lg text-center"
                  >
                    <Rocket className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <p className="text-sm font-medium">Fade In Right</p>
                  </motion.div>
                </div>
              </CardContent>
            </Card>

            {/* Scale Animation */}
            <Card>
              <CardHeader>
                <CardTitle>Scale with Spring</CardTitle>
                <CardDescription>Bouncy spring physics for natural feel</CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={scaleInSpring}
                  className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-center"
                >
                  <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <p className="text-lg font-semibold">Spring Animation</p>
                  <p className="text-sm text-muted-foreground">Natural bouncy motion</p>
                </motion.div>
              </CardContent>
            </Card>

            {/* Staggered List */}
            <Card>
              <CardHeader>
                <CardTitle>Staggered Children</CardTitle>
                <CardDescription>Sequential animation with delay</CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatedList staggerDelay={0.1}>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <AnimatedListItem key={item}>
                      <div className="p-3 mb-2 bg-muted rounded-lg flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">List Item {item}</span>
                        <Badge variant="outline" className="ml-auto">
                          Staggered
                        </Badge>
                      </div>
                    </AnimatedListItem>
                  ))}
                </AnimatedList>
              </CardContent>
            </Card>

            {/* Scroll Animation */}
            <AnimatedSection threshold={0.3}>
              <Card>
                <CardHeader>
                  <CardTitle>Scroll-Triggered Animation</CardTitle>
                  <CardDescription>
                    This card animated when you scrolled it into view
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    ref={scrollRef as React.RefObject<HTMLDivElement>}
                    className={`p-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white text-center transition-all ${
                      isInView ? 'opacity-100' : 'opacity-50'
                    }`}
                  >
                    <AlertCircle className="h-10 w-10 mx-auto mb-3" />
                    <p className="text-lg font-semibold">
                      {isInView ? '👀 In View!' : '📜 Scroll to see me'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          </TabsContent>

          {/* Micro-interactions */}
          <TabsContent value="interactions" className="space-y-6">
            {/* Button Animations */}
            <Card>
              <CardHeader>
                <CardTitle>Button Micro-interactions</CardTitle>
                <CardDescription>Hover and tap feedback animations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <motion.button
                    whileHover={buttonHover}
                    whileTap={buttonTap}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
                    onClick={() => setClickCount((prev) => prev + 1)}
                  >
                    Hover & Click Me ({clickCount})
                  </motion.button>

                  <AnimatedButton animationType="bounce">
                    <span className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium inline-block">
                      Bounce Button
                    </span>
                  </AnimatedButton>

                  <AnimatedButton animationType="wiggle">
                    <span className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium inline-block">
                      Wiggle Button
                    </span>
                  </AnimatedButton>
                </div>
              </CardContent>
            </Card>

            {/* Card Hover */}
            <Card>
              <CardHeader>
                <CardTitle>Card Hover Effects</CardTitle>
                <CardDescription>Lift and shadow on hover</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <AnimatedCard key={item}>
                      <div className="p-6 border rounded-lg cursor-pointer">
                        <Star className="h-8 w-8 mb-3 text-yellow-500" />
                        <h3 className="font-semibold mb-1">Card {item}</h3>
                        <p className="text-sm text-muted-foreground">
                          Hover to see lift effect
                        </p>
                      </div>
                    </AnimatedCard>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Continuous Animations */}
            <Card>
              <CardHeader>
                <CardTitle>Continuous Animations</CardTitle>
                <CardDescription>Looping animations for attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6">
                  {/* Pulse */}
                  <div className="text-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 text-white rounded-full mb-2"
                    >
                      <Heart className="h-8 w-8" />
                    </motion.div>
                    <p className="text-sm font-medium">Pulse</p>
                  </div>

                  {/* Rotate */}
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 text-white rounded-full mb-2"
                    >
                      <Zap className="h-8 w-8" />
                    </motion.div>
                    <p className="text-sm font-medium">Rotate</p>
                  </div>

                  {/* Bounce */}
                  <div className="text-center">
                    <motion.div
                      animate={{ y: [0, -20, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="inline-flex items-center justify-center w-16 h-16 bg-green-500 text-white rounded-full mb-2"
                    >
                      <Rocket className="h-8 w-8" />
                    </motion.div>
                    <p className="text-sm font-medium">Bounce</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hover State */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Hover Detection</CardTitle>
                <CardDescription>Using useHoverAnimation hook</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...hoverProps}
                  className={`p-8 border-2 rounded-lg text-center transition-all cursor-pointer ${
                    isHovered
                      ? 'border-primary bg-primary/5 scale-105'
                      : 'border-muted'
                  }`}
                >
                  <Star
                    className={`h-12 w-12 mx-auto mb-3 transition-colors ${
                      isHovered ? 'text-yellow-500' : 'text-muted-foreground'
                    }`}
                  />
                  <p className="text-lg font-semibold">
                    {isHovered ? '✨ Hovering!' : '👆 Hover over me'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced */}
          <TabsContent value="advanced" className="space-y-6">
            {/* Modal Animation */}
            <Card>
              <CardHeader>
                <CardTitle>Modal Transitions</CardTitle>
                <CardDescription>Smooth entry and exit animations</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowModal(true)}>Open Animated Modal</Button>
              </CardContent>
            </Card>

            {/* Gesture Animation */}
            <Card>
              <CardHeader>
                <CardTitle>Drag Gesture</CardTitle>
                <CardDescription>Try dragging the cards below</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <motion.div
                    drag
                    dragConstraints={{ left: 0, right: 200, top: 0, bottom: 0 }}
                    className="p-6 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-lg cursor-grab active:cursor-grabbing"
                  >
                    <Zap className="h-8 w-8 mb-2" />
                    <p className="font-semibold">Drag Me!</p>
                  </motion.div>

                  <motion.div
                    drag
                    dragConstraints={{ left: 0, right: 200, top: 0, bottom: 0 }}
                    whileDrag={{ scale: 1.1 }}
                    className="p-6 bg-gradient-to-br from-green-500 to-teal-500 text-white rounded-lg cursor-grab active:cursor-grabbing"
                  >
                    <Rocket className="h-8 w-8 mb-2" />
                    <p className="font-semibold">Or Me!</p>
                  </motion.div>
                </div>
              </CardContent>
            </Card>

            {/* Path Animation */}
            <Card>
              <CardHeader>
                <CardTitle>SVG Path Animation</CardTitle>
                <CardDescription>Animated check mark</CardDescription>
              </CardHeader>
              <CardContent>
                <motion.svg
                  width="100"
                  height="100"
                  viewBox="0 0 100 100"
                  initial="hidden"
                  animate="visible"
                  className="mx-auto"
                >
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10b981"
                    strokeWidth="4"
                    fill="none"
                    variants={{
                      hidden: { pathLength: 0 },
                      visible: { pathLength: 1 },
                    }}
                    transition={{ duration: 1, ease: 'easeInOut' }}
                  />
                  <motion.path
                    d="M 30 50 L 45 65 L 70 35"
                    stroke="#10b981"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    variants={{
                      hidden: { pathLength: 0 },
                      visible: { pathLength: 1 },
                    }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  />
                </motion.svg>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Features Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Animation Features</CardTitle>
            <CardDescription>Comprehensive animation system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <h4 className="font-semibold mb-2">✨ Variants</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 15+ pre-built animation variants</li>
                  <li>• Fade, slide, scale, rotate animations</li>
                  <li>• Stagger and sequence support</li>
                  <li>• Customizable transitions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🎯 Micro-interactions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Button hover and tap feedback</li>
                  <li>• Card lift on hover</li>
                  <li>• Continuous animations (pulse, spin)</li>
                  <li>• Gesture-based interactions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🚀 Advanced</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Page transitions</li>
                  <li>• Scroll-triggered animations</li>
                  <li>• Modal/dialog transitions</li>
                  <li>• SVG path animations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Animated Modal */}
      <AnimatedModal isOpen={showModal} onClose={() => setShowModal(false)}>
        <Card className="w-[90vw] max-w-md">
          <CardHeader>
            <CardTitle>Animated Modal</CardTitle>
            <CardDescription>With smooth entry and exit transitions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This modal uses spring physics for natural feel. Notice the smooth scale and
              fade animation.
            </p>
            <Button onClick={() => setShowModal(false)} className="w-full">
              Close Modal
            </Button>
          </CardContent>
        </Card>
      </AnimatedModal>
    </AnimatedPage>
  );
}
