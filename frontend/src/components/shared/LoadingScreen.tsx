"use client"

import { useEffect, useState } from 'react'

const tips = [
  {
    en: "Tip: Record payments immediately to avoid confusion later.",
    te: "చిట్కా: గందరగోళం తప్పించుకోవడానికి వెంటనే చెల్లింపులు నమోదు చేయండి."
  },
  {
    en: "Tip: Use Auto Assign to fill beds from the ground floor first.",
    te: "చిట్కా: క్రింది అంతస్తు నుండి మంచాలు నింపడానికి ఆటో అసైన్ వాడండి."
  },
  {
    en: "Tip: Send WhatsApp reminders to tenants before the due date.",
    te: "చిట్కా: గడువు తేదీకి ముందు అద్దెదారులకు వాట్సాప్ రిమైండర్లు పంపండి."
  },
  {
    en: "Tip: Check the heatmap daily to spot empty beds quickly.",
    te: "చిట్కా: ఖాళీ మంచాలు త్వరగా గుర్తించడానికి రోజూ హీట్మ్యాప్ చెక్ చేయండి."
  },
  {
    en: "Tip: Take Aadhaar photo during check-in to avoid issues later.",
    te: "చిట్కా: తర్వాత సమస్యలు తప్పించుకోవడానికి చేక్-ఇన్ సమయంలో ఆధార్ ఫోటో తీయండి."
  },
  {
    en: "Tip: Mark tenants as vacated on time to keep occupancy accurate.",
    te: "చిట్కా: ఖాళీని సరిగ్గా చూపించడానికి సమయానికి అద్దెదారులను ఖాళీగా గుర్తించండి."
  },
  {
    en: "Tip: Green rooms are full. Red rooms need new tenants.",
    te: "చిట్కా: ఆకుపచ్చ గదులు నిండినవి. ఎర్రని గదులకు కొత్త అద్దెదారులు అవసరం."
  },
  {
    en: "Tip: Collect partial payments and the balance auto-carries forward.",
    te: "చిట్కా: పాక్షిక చెల్లింపులు వసూలు చేయండి — బాకీ స్వయంచాలకంగా ముందుకు వస్తుంది."
  },
  {
    en: "Tip: Multiple branches? Switch branches from the top bar.",
    te: "చిట్కా: అనేక శాఖలు ఉన్నాయా? పై బార్ నుండి శాఖలు మార్చండి."
  },
  {
    en: "Tip: The red number on dashboard is your top priority today.",
    te: "చిట్కా: డ్యాష్బోర్డ్లో ఎర్రని సంఖ్య మీ నేటి అగ్రప్రాధాన్యత."
  },
  {
    en: "Tip: Tap any room on the heatmap to see who lives there.",
    te: "చిట్కా: అక్కడ ఎవరు నివసిస్తున్నారో చూడటానికి హీట్మ్యాప్లో ఏ గదినైనా నొక్కండి."
  }
]

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ 
  message 
}: LoadingScreenProps) {
  const [currentTip, setCurrentTip] = useState(0)
  const [lang, setLang] = useState<'en' | 'te'>('en')
  const [visible, setVisible] = useState(true)
  const [show, setShow] = useState(false)

  // Wait 100ms for theme colors to apply before showing loader
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Read language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('easypg_lang') as 'en' | 'te'
    if (savedLang) setLang(savedLang)
  }, [])

  // Rotate tips every 3 seconds with fade
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrentTip(prev => (prev + 1) % tips.length)
        setVisible(true)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const tip = tips[currentTip]

  if (!show) return (
    <div className="min-h-screen bg-background" />
  )

  return (
    <div className="min-h-screen bg-background flex flex-col
      items-center justify-center px-8 gap-8">

      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 bg-primary rounded-2xl
          flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-bold">EP</span>
        </div>
        <span className="text-xl font-bold text-foreground">
          EasyPG
        </span>
      </div>

      {/* Spinner */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary/20
          border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">
          {message || (lang === 'te' ? 'లోడ్ అవుతోంది...' : 'Loading...')}
        </p>
      </div>

      {/* Tip card */}
      <div
        className="w-full max-w-sm bg-primary/10 border border-primary/20
          rounded-2xl p-5 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-primary">
              {tip.en}
            </p>
            <p className="text-sm text-primary/80 mt-1">
              {tip.te}
            </p>
          </div>
        </div>
      </div>

      {/* Tip dots indicator */}
      <div className="flex gap-1.5">
        {tips.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300
              ${i === currentTip
                ? 'w-4 bg-primary'
                : 'w-1.5 bg-muted'
              }`}
          />
        ))}
      </div>
    </div>
  )
}
