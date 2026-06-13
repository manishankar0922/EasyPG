#!/bin/bash

echo "--- PHASE 1 ---"
grep -rn '"[A-Z][a-z]' src/app --include="*.tsx" \
  | grep -v "className\|import\|type\|interface\|//" \
  | grep -v "translations\|\.ts\b" \
  > hardcoded_strings.txt

grep -rn 'placeholder="' src/ --include="*.tsx" \
  | grep -v "t\.\|translations\[" \
  >> hardcoded_strings.txt

grep -rn 'toast\.' src/ --include="*.tsx" \
  | grep -v "t\.\|translations\[" \
  >> hardcoded_strings.txt

grep -rn '<button\|<Button' src/ --include="*.tsx" -A1 \
  | grep -v "t\.\|{t\." \
  >> hardcoded_strings.txt

echo "Total hardcoded strings found:"
wc -l hardcoded_strings.txt

echo "--- PHASE 2 ---"
ls src/lib/translations.ts && echo "✅ File exists" || echo "❌ translations.ts MISSING"

echo "--- PHASE 3 ---"
grep -rn 'useTranslation' src/ --include="*.tsx" | grep -v "LanguageContext\|translations"
echo "Above files use OLD hook — must be replaced with useLanguage()"

grep -rln 'return (' src/app --include="*.tsx" | xargs grep -L 'useLanguage\|useTranslation' | xargs grep -l '"[A-Z]'
echo "Above files have text but no translation hook"

grep -rln 'useLanguage' src/ --include="*.tsx"
echo "Above files correctly use useLanguage ✅"

echo "--- PHASE 4 ---"
grep -rn 'LanguageProvider' src/ --include="*.tsx"
grep -n 'LanguageProvider' src/app/\(dashboard\)/layout.tsx && echo "✅ Dashboard wrapped" || echo "❌ Dashboard NOT wrapped"
ls src/context/LanguageContext.tsx && echo "✅ Context file exists" || echo "❌ LanguageContext.tsx MISSING"

echo "--- PHASE 5 ---"
cat src/hooks/useTranslation.ts 2>/dev/null || cat src/context/LanguageContext.tsx
grep -rn 'easypg_lang' src/ --include="*.ts" --include="*.tsx"
echo "All above must use same key: easypg_lang"

echo "--- PHASE 6 ---"
grep -n 'useLanguage\|t\.' src/components/shared/BottomNav.tsx 2>/dev/null || echo "❌ BottomNav missing translations"
grep -n 'useLanguage\|t\.' src/app/\(dashboard\)/page.tsx 2>/dev/null || echo "❌ Dashboard missing translations"
grep -n 'useLanguage\|t\.' src/app/\(dashboard\)/tenants/new/page.tsx 2>/dev/null || echo "❌ Add Tenant missing translations"
grep -n 'useLanguage\|t\.' src/app/\(dashboard\)/payments/page.tsx 2>/dev/null || echo "❌ Payments missing translations"
grep -n 'useLanguage\|lang' src/components/shared/LoadingScreen.tsx 2>/dev/null || echo "❌ LoadingScreen missing lang"

echo "--- PHASE 7 ---"
find src/ -name "*.tsx" -exec sed -i "s/const t = useTranslation()/const { t, lang } = useLanguage()/g" {} \;
find src/ -name "*.tsx" -exec sed -i "s/import { useTranslation }/import { useLanguage }/g" {} \;
echo "✅ Hook replacement done"

echo "--- PHASE 8 ---"
npx tsc --noEmit 2>&1 | head -50
npm run build 2>&1 | tail -30

echo "--- FINAL REPORT ---"
node -e "
const fs = require('fs')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Telugu Audit Report')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
try {
  const lines = fs.readFileSync('hardcoded_strings.txt', 'utf8').split('\n').filter(Boolean)
  console.log('Hardcoded strings found:', lines.length)
} catch(e) {
  console.log('No hardcoded strings file found')
}
"
