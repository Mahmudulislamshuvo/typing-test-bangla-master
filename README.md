# Bilingual Typing Test (English + Bengali)

একটি আধুনিক Next.js + Tailwind টাইপিং টেস্ট অ্যাপ যেখানে ইংরেজি ও বাংলায় টাইপিং প্র্যাকটিস করা যায়।

## Highlights

- ভাষা নির্বাচন (English / বাংলা)
- সময় বাছাই: 1, 2, 3, 5, 10, 15, 20 মিনিট
- টাইমার অনুযায়ী JSON ডেটা থেকে ডাইনামিক টেক্সট লোড
- বাংলা Unicode-aware টাইপিং সাপোর্ট
- লাইভ WPM, Accuracy, Errors
- কপি/পেস্ট/ড্র্যাগ প্রতিরোধ (anti-cheat)
- টেস্ট শেষে রেজাল্ট ভিউ + রিপোর্ট সেভ
- রিপোর্ট পেজে ডিভাইসভিত্তিক তালিকা ও গ্রাফ

## Tech Stack

- Next.js (App Router)
- Tailwind CSS
- React

## Run Locally

```bash
npm install
npm run dev
```

তারপর ব্রাউজারে খুলুন: http://localhost:3000

## Data Files

ডেটাসেট রাখা আছে public/data/ এ। ফাইল নামের ফরম্যাট: ভাষা + সময়।

উদাহরণ:

- en-1min.json, en-2min.json, en-3min.json, en-5min.json, en-10min.json, en-15min.json, en-20min.json
- bn-1min.json, bn-2min.json, bn-3min.json, bn-5min.json, bn-10min.json, bn-15min.json, bn-20min.json

অ্যাপটি সিলেকশনের উপর ভিত্তি করে সংশ্লিষ্ট ফাইল থেকে একটি র‍্যান্ডম ডকুমেন্ট নেয়।

## JSON Format (Example)

```json
{
  "language": "bn",
  "durationMinutes": 5,
  "documents": [
    {
      "id": "bn-5-001",
      "title": "একাগ্র অনুশীলন",
      "text": "...typing passage..."
    }
  ]
}
```

আপনি চাইলে documents এ আরও আইটেম যোগ করে ডেটাসেট বড় করতে পারেন।

## Folder Overview (Quick)

- app/ → পেজ ও রাউট
- components/ → UI কম্পোনেন্ট
- lib/ → ইউটিলিটি ও ডেটা লোডার
- public/data/ → টাইপিং ডেটাসেট

## Notes

- বাংলা টেক্সট ইনপুটে Unicode normalize ব্যবহার করা হয়, তাই ডিফারেন্ট কম্বিনেশনের লেখাও সঠিকভাবে ম্যাচ হয়।
