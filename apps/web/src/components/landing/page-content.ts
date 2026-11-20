import type { Language } from "@/lib/i18n/translations";

/**
 * Long-form copy for the public About / Privacy / Terms pages, kept beside the
 * landing translations (UI chrome lives in `translations.ts`). Every document
 * exists in both languages with the same section ids.
 */
export type DocSection = { id: string; heading: string; body?: string[]; bullets?: string[] };
export type Doc = { title: string; lead: string; sections: DocSection[] };

export const LEGAL_UPDATED = "2026-11-20";

const about: Record<Language, Doc> = {
  en: {
    title: "About Rizq Khata",
    lead: "Rizq Khata is a point of sale and khata for small shops in Bangladesh. The counter, the stock room and the books share one place, and Bangla comes first.",
    sections: [
      {
        id: "name",
        heading: "The name",
        body: [
          "Rizq is livelihood: what a day of honest work brings home. A khata is the ledger every shop keeps. Rizq Khata is the ledger for your livelihood: every sale, every taka going out, and what is left at the end of the day.",
        ],
      },
      {
        id: "why",
        heading: "Why we built it",
        body: [
          "Most shops still run on a paper khata, a calculator and memory. That works until the shop gets busy. Stock runs out without warning, dues are forgotten, and nobody can say what the day really earned.",
          "We built Rizq Khata so that one entry at the counter keeps everything else in agreement: stock, the customer's history, the day's takings and the books.",
        ],
      },
      {
        id: "beliefs",
        heading: "What we believe",
        bullets: [
          "One entry, everything updates. A sale is written once and everything else follows from it.",
          "The counter sets the pace. Rizq Khata is built for someone standing up, on a phone, with a customer waiting.",
          "Bangla is the product, not a translation. That means Bangla screens, prices in taka, mobile money, and prices agreed at the counter.",
          "Honest numbers. Money is shown exactly and never rounded where someone pays it.",
        ],
      },
      {
        id: "who",
        heading: "Who it is for",
        body: [
          "Grocery, pharmacy, clothing and electronics shops, and repair shops that fix phones and electronics, whether they have one branch or several.",
        ],
      },
      {
        id: "now",
        heading: "Where we are now",
        body: [
          "Rizq Khata is free to start on the web today. Apps for Android and iPhone are coming soon, and they will use the same account.",
        ],
      },
    ],
  },
  bn: {
    title: "রিজক খাতা সম্পর্কে",
    lead: "রিজক খাতা বাংলাদেশের ছোট দোকানের জন্য বিক্রি আর হিসাবের খাতা — কাউন্টার, স্টক আর হিসাব এক জায়গায়, বাংলায় আগে।",
    sections: [
      {
        id: "name",
        heading: "নামটা কেন",
        body: [
          "রিজক মানে জীবিকা — সৎ পরিশ্রমে দিনের শেষে যা ঘরে আসে। খাতা হলো সেই হিসাবের বই যা প্রতিটি দোকান রাখে। রিজক খাতা আপনার জীবিকার খাতা: প্রতিটি বিক্রি, বের হওয়া প্রতিটি টাকা, আর দিন শেষে কী থাকল।",
        ],
      },
      {
        id: "why",
        heading: "কেন বানালাম",
        body: [
          "বেশিরভাগ দোকান এখনো চলে কাগজের খাতা, ক্যালকুলেটর আর মনে রাখার ওপর। দোকানে ভিড় না হওয়া পর্যন্ত এতে চলে যায়। তারপর হঠাৎ স্টক শেষ হয়ে যায়, বাকি ভুলে যাওয়া হয়, আর দিনে আসলে কত আয় হলো কেউ বলতে পারে না।",
          "তাই রিজক খাতা বানিয়েছি, যাতে কাউন্টারে একবার লিখলেই বাকি সব মিলে যায় — স্টক, কাস্টমারের হিসাব, দিনের আয় আর খাতা।",
        ],
      },
      {
        id: "beliefs",
        heading: "আমরা যা বিশ্বাস করি",
        bullets: [
          "একবার লিখুন, সব মিলে যাবে। বিক্রি একবার লেখা হয়, বাকি সব তা থেকেই আসে।",
          "কাউন্টারই গতি ঠিক করে। দাঁড়িয়ে, ফোন হাতে, কাস্টমার অপেক্ষায় — এমন অবস্থার জন্যই বানানো।",
          "বাংলা কোনো অনুবাদ নয়, এটাই আসল পণ্য। বাংলা স্ক্রিন, টাকায় দাম, মোবাইল ব্যাংকিং, কাউন্টারে দরদাম।",
          "সঠিক হিসাব। টাকার অঙ্ক হুবহু দেখানো হয় — যেখানে কেউ টাকা দেয়, সেখানে কখনো গোল করা হয় না।",
        ],
      },
      {
        id: "who",
        heading: "কাদের জন্য",
        body: [
          "মুদি, ফার্মেসি, কাপড় আর ইলেকট্রনিক্সের দোকান, আর ফোন ও ইলেকট্রনিক্স মেরামতের দোকান — এক শাখা হোক বা একাধিক।",
        ],
      },
      {
        id: "now",
        heading: "এখন কোথায় আছি",
        body: ["রিজক খাতা ওয়েবে আজই ফ্রি শুরু করা যায়। অ্যান্ড্রয়েড আর আইফোন অ্যাপ শিগগিরই আসছে — একই অ্যাকাউন্টে চলবে।"],
      },
    ],
  },
};

const privacy: Record<Language, Doc> = {
  en: {
    title: "Privacy policy",
    lead: "What Rizq Khata collects, why it collects it, and the control you have over it. This policy covers the website, the web dashboard and the Rizq Khata phone apps.",
    sections: [
      {
        id: "collect",
        heading: "What we collect",
        bullets: [
          "Account details: your name, email address, and password (stored only as a secure hash). If you choose, also a profile photo or a Google sign-in.",
          "Business details: business and branch names, address, phone number, currency, language and tax settings.",
          "Records you enter: products, prices, stock, sales, expenses, salaries, suppliers, repair jobs, notes, and customer details such as name and phone number.",
          "Technical data: sign-in sessions, the device or browser you use, and the basic logs needed to keep the service running and secure.",
        ],
      },
      {
        id: "use",
        heading: "How we use it",
        bullets: [
          "To run the service: record sales, keep your stock and books, and sync your devices.",
          "To keep accounts secure and prevent abuse.",
          "To answer you when you contact us.",
          "To improve the product, using combined usage figures that do not identify you.",
        ],
        body: ["We do not sell your data, and we do not use your shop's records for advertising."],
      },
      {
        id: "customers",
        heading: "Your customers' information",
        body: [
          "When you record a customer, you are responsible for having their permission to keep their name and phone number. We store it only to provide the service to you.",
          "WhatsApp messages for repair jobs open in WhatsApp on your own phone. We do not send them for you.",
        ],
      },
      {
        id: "share",
        heading: "Who can see your data",
        bullets: [
          "People you add to your business, limited by the role you give them: owner, manager, cashier or stock keeper.",
          "Service providers that host our servers and store uploaded photos, only so we can run the service.",
          "Authorities, when the law requires it.",
        ],
      },
      {
        id: "device",
        heading: "Data kept on your phone",
        body: [
          "The phone app keeps a copy of your product list on the device, along with anything entered while offline, until it syncs. Signing out removes your account from the app.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies and local storage",
        body: [
          "We use essential cookies to keep you signed in and to remember your active branch. The website also remembers your language choice in your browser. We do not use advertising cookies.",
        ],
      },
      {
        id: "retention",
        heading: "Keeping and deleting data",
        body: [
          "We keep your records while your account is active. You can ask us to delete your account and business data. Some records may be kept for a limited time where the law requires it.",
        ],
      },
      {
        id: "security",
        heading: "Security",
        body: [
          "Connections are encrypted, passwords are hashed, and access is limited by role. No system is perfectly secure, so please use a strong password and keep your devices locked.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to this policy",
        body: ["If we change this policy in a meaningful way, we will tell you in the app or by email before the change takes effect."],
      },
    ],
  },
  bn: {
    title: "গোপনীয়তা নীতি",
    lead: "রিজক খাতা কী তথ্য রাখে, কেন রাখে, আর তার ওপর আপনার কী নিয়ন্ত্রণ আছে। এই নীতি ওয়েবসাইট, ওয়েব ড্যাশবোর্ড আর রিজক খাতা ফোন অ্যাপ — সবকিছুর জন্য প্রযোজ্য।",
    sections: [
      {
        id: "collect",
        heading: "আমরা কী তথ্য রাখি",
        bullets: [
          "অ্যাকাউন্টের তথ্য: আপনার নাম, ইমেইল আর পাসওয়ার্ড (শুধু নিরাপদ হ্যাশ হিসেবে রাখা হয়)। আপনি চাইলে প্রোফাইল ছবি বা গুগল সাইন-ইনও।",
          "ব্যবসার তথ্য: ব্যবসা ও শাখার নাম, ঠিকানা, ফোন নম্বর, মুদ্রা, ভাষা আর ট্যাক্সের সেটিং।",
          "আপনার লেখা হিসাব: পণ্য, দাম, স্টক, বিক্রি, খরচ, বেতন, সাপ্লায়ার, মেরামতের জব, নোট, আর কাস্টমারের নাম ও ফোন নম্বরের মতো তথ্য।",
          "কারিগরি তথ্য: সাইন-ইন সেশন, আপনার ডিভাইস বা ব্রাউজার, আর সার্ভিস চালু ও নিরাপদ রাখার জন্য দরকারি সাধারণ লগ।",
        ],
      },
      {
        id: "use",
        heading: "তথ্য কীভাবে ব্যবহার করি",
        bullets: [
          "সার্ভিস চালাতে: বিক্রি লেখা, স্টক ও হিসাব রাখা, আর আপনার ডিভাইসগুলো সিঙ্ক করা।",
          "অ্যাকাউন্ট নিরাপদ রাখতে আর অপব্যবহার ঠেকাতে।",
          "আপনি যোগাযোগ করলে উত্তর দিতে।",
          "পণ্য উন্নত করতে — সম্মিলিত ব্যবহারের হিসাব দিয়ে, যাতে আপনাকে আলাদা করে চেনা যায় না।",
        ],
        body: ["আমরা আপনার তথ্য বিক্রি করি না, আর দোকানের হিসাব বিজ্ঞাপনের কাজে ব্যবহার করি না।"],
      },
      {
        id: "customers",
        heading: "আপনার কাস্টমারের তথ্য",
        body: [
          "কাস্টমারের নাম আর ফোন নম্বর রাখার জন্য তাঁর অনুমতি নেওয়ার দায়িত্ব আপনার। আমরা তা রাখি শুধু আপনাকে সার্ভিস দেওয়ার জন্য।",
          "মেরামতের জবের হোয়াটসঅ্যাপ মেসেজ আপনার নিজের ফোনের হোয়াটসঅ্যাপে খোলে — আমরা আপনার হয়ে পাঠাই না।",
        ],
      },
      {
        id: "share",
        heading: "আপনার তথ্য কারা দেখতে পারে",
        bullets: [
          "আপনি যাঁদের ব্যবসায় যোগ করেন, আপনার দেওয়া ভূমিকা অনুযায়ী: মালিক, ম্যানেজার, ক্যাশিয়ার বা স্টক কিপার।",
          "যে সেবাদাতারা আমাদের সার্ভার চালায় আর আপলোড করা ছবি রাখে — শুধু সার্ভিস চালানোর জন্য।",
          "আইন অনুযায়ী প্রয়োজন হলে কর্তৃপক্ষ।",
        ],
      },
      {
        id: "device",
        heading: "ফোনে রাখা তথ্য",
        body: [
          "ফোন অ্যাপ আপনার পণ্যের তালিকার একটি কপি, আর অফলাইনে লেখা হিসাব সিঙ্ক না হওয়া পর্যন্ত ফোনেই রাখে। সাইন আউট করলে অ্যাপ থেকে অ্যাকাউন্ট সরে যায়।",
        ],
      },
      {
        id: "cookies",
        heading: "কুকি আর লোকাল স্টোরেজ",
        body: [
          "আপনাকে সাইন-ইন রাখতে আর চালু শাখা মনে রাখতে আমরা শুধু প্রয়োজনীয় কুকি ব্যবহার করি। ওয়েবসাইট আপনার ব্রাউজারে ভাষার পছন্দ মনে রাখে। বিজ্ঞাপনের কোনো কুকি নেই।",
        ],
      },
      {
        id: "retention",
        heading: "তথ্য রাখা ও মুছে ফেলা",
        body: [
          "অ্যাকাউন্ট চালু থাকা পর্যন্ত আমরা আপনার হিসাব রাখি। আপনি অ্যাকাউন্ট আর ব্যবসার তথ্য মুছে ফেলতে বলতে পারেন। আইনের প্রয়োজনে কিছু হিসাব নির্দিষ্ট সময় পর্যন্ত রাখা হতে পারে।",
        ],
      },
      {
        id: "security",
        heading: "নিরাপত্তা",
        body: [
          "সংযোগ এনক্রিপ্ট করা, পাসওয়ার্ড হ্যাশ করা, আর ভূমিকা অনুযায়ী প্রবেশাধিকার সীমিত। কোনো ব্যবস্থাই পুরোপুরি নিরাপদ নয়, তাই শক্ত পাসওয়ার্ড ব্যবহার করুন আর ডিভাইস লক রাখুন।",
        ],
      },
      {
        id: "changes",
        heading: "এই নীতির পরিবর্তন",
        body: ["নীতিতে গুরুত্বপূর্ণ কোনো পরিবর্তন হলে তা কার্যকর হওয়ার আগে অ্যাপে বা ইমেইলে জানাব।"],
      },
    ],
  },
};

const terms: Record<Language, Doc> = {
  en: {
    title: "Terms of use",
    lead: "These terms are the agreement between you and Rizq Khata when you use the website, the web dashboard or the phone apps. By creating an account you accept them.",
    sections: [
      {
        id: "account",
        heading: "Your account",
        bullets: [
          "Give accurate details and keep your password private.",
          "You are responsible for what happens under your account, including the staff accounts you create.",
          "You must be old enough to enter a contract where you live.",
        ],
      },
      {
        id: "use",
        heading: "Using the service",
        body: [
          "Use Rizq Khata only for lawful business. Do not try to break or overload the service, get around its security, or reach another business's data.",
        ],
      },
      {
        id: "data",
        heading: "Your data",
        body: [
          "The records you enter belong to you. You give us permission to store and process them only to provide the service to you. You can ask us to delete them at any time.",
        ],
      },
      {
        id: "accuracy",
        heading: "Accuracy of records",
        body: [
          "Rizq Khata does the arithmetic, but the entries are yours. Check prices, tax settings and reports before you rely on them for tax or legal filings. Rizq Khata does not give accounting or tax advice.",
        ],
      },
      {
        id: "price",
        heading: "Price",
        body: [
          "Rizq Khata is free to start. If we introduce paid plans, we will tell you in advance and you can decide whether to continue. We will not charge you without your agreement.",
        ],
      },
      {
        id: "offline",
        heading: "Offline use",
        body: [
          "Entries made offline in the phone app are saved on the phone and sent when it reconnects. If the phone is lost or the app is removed before it syncs, those entries can be lost.",
        ],
      },
      {
        id: "availability",
        heading: "Availability",
        body: [
          "We work to keep the service running, but it may sometimes be unavailable for maintenance or for reasons outside our control. During this early release the service is provided as it is.",
        ],
      },
      {
        id: "liability",
        heading: "Liability",
        body: [
          "As far as the law allows, Rizq Khata is not liable for indirect losses such as lost profit, or for losses caused by entries made incorrectly. Nothing in these terms limits rights you have under law that cannot be limited.",
        ],
      },
      {
        id: "ending",
        heading: "Ending your account",
        body: [
          "You can stop using Rizq Khata at any time. We may suspend an account that breaks these terms, and where we can we will tell you why.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to these terms",
        body: [
          "We may update these terms. If a change matters, we will tell you before it takes effect. If you keep using the service after that, you accept the new terms.",
        ],
      },
      {
        id: "law",
        heading: "Governing law",
        body: ["These terms are governed by the laws of Bangladesh."],
      },
    ],
  },
  bn: {
    title: "ব্যবহারের শর্তাবলি",
    lead: "ওয়েবসাইট, ওয়েব ড্যাশবোর্ড বা ফোন অ্যাপ ব্যবহারের সময় আপনার আর রিজক খাতার মধ্যে এই শর্তগুলোই চুক্তি। অ্যাকাউন্ট খুললে আপনি এগুলো মেনে নিচ্ছেন।",
    sections: [
      {
        id: "account",
        heading: "আপনার অ্যাকাউন্ট",
        bullets: [
          "সঠিক তথ্য দিন আর পাসওয়ার্ড গোপন রাখুন।",
          "আপনার অ্যাকাউন্টে যা হয় — আপনার খোলা কর্মীদের অ্যাকাউন্টসহ — তার দায়িত্ব আপনার।",
          "আপনার এলাকার আইন অনুযায়ী চুক্তি করার মতো বয়স হতে হবে।",
        ],
      },
      {
        id: "use",
        heading: "সার্ভিস ব্যবহার",
        body: [
          "রিজক খাতা শুধু বৈধ ব্যবসার কাজে ব্যবহার করুন। সার্ভিস নষ্ট বা অতিরিক্ত চাপ দেওয়া, নিরাপত্তা এড়ানো, বা অন্য ব্যবসার তথ্যে ঢোকার চেষ্টা করবেন না।",
        ],
      },
      {
        id: "data",
        heading: "আপনার তথ্য",
        body: [
          "আপনার লেখা হিসাবের মালিক আপনি। শুধু আপনাকে সার্ভিস দেওয়ার জন্য তা রাখা ও প্রক্রিয়া করার অনুমতি আপনি আমাদের দিচ্ছেন। যেকোনো সময় মুছে ফেলতে বলতে পারেন।",
        ],
      },
      {
        id: "accuracy",
        heading: "হিসাবের নির্ভুলতা",
        body: [
          "যোগ-বিয়োগ রিজক খাতা করে, কিন্তু লেখা আপনার। ট্যাক্স বা আইনি কাজে ব্যবহারের আগে দাম, ট্যাক্স সেটিং আর রিপোর্ট মিলিয়ে নিন। রিজক খাতা হিসাবরক্ষণ বা ট্যাক্সের পরামর্শ দেয় না।",
        ],
      },
      {
        id: "price",
        heading: "মূল্য",
        body: [
          "রিজক খাতা শুরু করা ফ্রি। পেইড প্ল্যান এলে আগে থেকেই জানাব, আর চালিয়ে যাবেন কি না আপনিই ঠিক করবেন। আপনার সম্মতি ছাড়া কোনো টাকা নেওয়া হবে না।",
        ],
      },
      {
        id: "offline",
        heading: "অফলাইন ব্যবহার",
        body: [
          "ফোন অ্যাপে অফলাইনে লেখা হিসাব ফোনে জমা থাকে আর নেট ফিরলে পাঠানো হয়। সিঙ্ক হওয়ার আগে ফোন হারালে বা অ্যাপ মুছে ফেললে সেই হিসাব হারিয়ে যেতে পারে।",
        ],
      },
      {
        id: "availability",
        heading: "সার্ভিসের প্রাপ্যতা",
        body: [
          "সার্ভিস চালু রাখতে আমরা চেষ্টা করি, তবে রক্ষণাবেক্ষণ বা নিয়ন্ত্রণের বাইরের কারণে মাঝে মাঝে বন্ধ থাকতে পারে। এই প্রাথমিক সংস্করণে সার্ভিস যেমন আছে তেমনভাবেই দেওয়া হচ্ছে।",
        ],
      },
      {
        id: "liability",
        heading: "দায়",
        body: [
          "আইন যতটা অনুমতি দেয়, পরোক্ষ ক্ষতি — যেমন হারানো লাভ — বা ভুল লেখার কারণে হওয়া ক্ষতির জন্য রিজক খাতা দায়ী নয়। আইনে যে অধিকার সীমিত করা যায় না, এই শর্ত তা সীমিত করে না।",
        ],
      },
      {
        id: "ending",
        heading: "অ্যাকাউন্ট বন্ধ করা",
        body: [
          "যেকোনো সময় রিজক খাতা ব্যবহার বন্ধ করতে পারেন। শর্ত ভাঙলে আমরা অ্যাকাউন্ট স্থগিত করতে পারি, আর সম্ভব হলে কারণ জানাব।",
        ],
      },
      {
        id: "changes",
        heading: "শর্তের পরিবর্তন",
        body: [
          "আমরা শর্ত হালনাগাদ করতে পারি। গুরুত্বপূর্ণ পরিবর্তন হলে কার্যকর হওয়ার আগে জানাব। এরপরও সার্ভিস ব্যবহার করলে নতুন শর্ত মেনে নিচ্ছেন।",
        ],
      },
      {
        id: "law",
        heading: "প্রযোজ্য আইন",
        body: ["এই শর্তাবলি বাংলাদেশের আইন অনুযায়ী পরিচালিত।"],
      },
    ],
  },
};

export const DOCS = { about, privacy, terms };
export type DocKey = keyof typeof DOCS;
