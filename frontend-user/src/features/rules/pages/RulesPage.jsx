import React, { useState } from 'react';

const Rules = () => {
  const [language, setLanguage] = useState('hi');

  // English translations
  const en = {
    title: 'NICE7777 Rules and Regulations',
    welcome: '!! Welcome to NICE7777!',
    important: 'Important Information',
    importantPoints: [
      'For all agents/users: 1% loss commission, 1% session loss commission!',
      'In our ID, the local rate runs according to the market rate. Fake/fraudulent people run incorrect rates in their IDs.',
      'This site is created only for entertainment and fun purposes.'
    ],
    warning: '⚠️ Warning',
    warningHeader: 'All clients are informed!!',
    warningPoints: [
      'Those who do quick betting: their winning bets will be directly removed, and they will have to settle the losing bets!!',
      'If multiple user IDs are used from the same IP address, all winning bets of those IDs will be directly removed, and they will have to settle the losing bets!!'
    ],
    noDispute: 'No dispute will be entertained later.',
    detailed: 'Detailed Rules',
    rules: [
      'Please spend a few minutes here to understand the rules of NICE7777, and comprehend accordingly.',
      'Those who do quick betting: their winning bets will be directly removed, and they will have to settle the losing bets! No dispute will be entertained later.',
      'All clients are informed not to keep simple passwords like 1234, 12345, 123456, etc.',
      'After logging in, change your password.',
      'Each game will have a charge of 15.0 coins.',
      'If you do not place a single bet on a match or session, you will be charged 15.0 coins.',
      'All advance bets will be taken after the toss.',
      'If a match is abandoned or ends in a tie, all bets will be cancelled and settlement will be done for sessions/matches that have been completed.',
      'If any technical issue occurs or rates become stagnant, the company reserves the right to cancel or invalidate bets placed in any market. Please note: all bets in all markets may be cancelled.',
      'Minimum bet on a match is 50.0 and maximum is 50000.0; minimum bet on a session is 100.0 and maximum is 55000.0.',
      'Place bets only after observing and understanding the rates during the match. No bet can be removed or altered once placed. You are solely responsible for all bets.',
      'Any client using ground committee to place bets: all their winning bets will be directly removed, and they will have to settle the losing bets! No dispute will be entertained later.',
      'Any client involved in UP bets: all their winning bets will be directly removed, and they will have to settle the losing bets! No dispute will be entertained later.',
      'All bets here will be validated by the ledger.',
      'You will be responsible for any internet connection issues.'
    ],
    footer: 'Please read and understand all rules carefully.'
  };

  // Hindi content
  const hi = {
    title: 'NICE7777 नियम और शर्तें',
    welcome: '!! NICE7777 में आपका स्वागत है!',
    important: 'महत्वपूर्ण सूचना',
    importantPoints: [
      'सभी एजेंट/यूजर के लिए मैंने लॉस कमीशन 1% सेशन लॉस कमीशन 1%!',
      'हमारे आईडी में मैंने स्थान भाव चलता है, माकेट रेट से चलता है। और डमी फ्रॉड लोग आईडी में गलत भाव चलाते हैं।',
      'यह साइट केवल मनोरंजन और मज्जे के लिए बनाई गई है।'
    ],
    warning: '⚠️ चेतावनी',
    warningHeader: 'सभी क्लाएंट को सुचित किया जाता है!!',
    warningPoints: [
      'जो जल्दी-जल्दी लगाई-खाई करते हैं, उनकी प्रौद्योगिकी वाली शर्तों के सीधे हटा दिए जाएंगे, और लॉस वाली शर्तों के सीधे लेनदेन करना पड़ेगा!!',
      'एक ही आईपी एड्रेस का उपयोग करके 1 से ज्यादा यूजर आईडी की शर्तों के भी प्रौद्योगिकी वाली शर्तों के सीधे हटा दिए जाएंगे, और लॉस वाली शर्तों के सीधे लेनदेन करना पड़ेगा!!'
    ],
    noDispute: 'बाद में कोई वाद विवाद मान्य नहीं होगा।',
    detailed: 'विस्तृत नियम',
    rules: [
      'कृपया NICE7777 के नियमों को समझने के लिए यहां कुछ मिनट दे, और अपने अनुसार समझ लें।',
      'जो जल्दी-जल्दी लगाई-खाई करते हैं, उनकी प्रौद्योगिकी वाली शर्तों के सीधे हटा दिए जाएंगे, और लॉस वाली शर्तों के सीधे लेनदेन करना पड़ेगा! बाद में कोई वाद विवाद मान्य नहीं होगा।',
      'सभी क्लाइट को सुचित किया जाता है कि कृपया सामान्य पासवर्ड न रखें। 1234, 12345, 123456 etc.',
      'लॉग इन करने के बाद अपना पासवर्ड बदल लें।',
      'प्रत्येक गेम के लिए 15.0/- कॉइन्स चार्ज रहेगा।',
      'यदि आप मैच या सेशन का एक भी सट्टा नहीं करते हैं, ऐसे में आपसे 15.0/- कॉइन्स का चार्ज लिया जायेगा।',
      'सभी एडवांस सट्टे टॉस के बाद लिए जाएंगे।',
      'खेल रद्द या टाई होने पर सभी सट्टे रद्द कर दिए जाएंगे और लेनदेन सेशन और मैच जो पूरा हो गया है उस पर किया जाएगा।',
      'यदि कोई तकनीकी समस्या होती है या भाव स्थिर रहते हैं, तो कंपनी सभी मार्केट में लगाई गई शर्तों को रद्द या अमान्य करने का अधिकार रखती है। कृपया ध्यान दें: सभी मार्केट की सभी शर्तें रद्द की जा सकती हैं।',
      'मैच का सट्टा कम से कम 50.0 और अधिकतम 50000.0 है और सेशन का सट्टा कम से कम 100.0 और अधिकतम 55000.0 है।',
      'मैच के दौरान भाव को देख और समझ कर ही सट्टा करें। किसी भी किए गए सट्टे को हटाया या बदला नहीं जायेगा। सभी सट्टे के लिए आप स्वयं जिम्मेवार हैं।',
      'ग्राउंड कमेटी का उपयोग करके शर्तें करने वाले किसी भी क्लाइट की सभी प्रौद्योगिकी वाली शर्तों के सीधे हटा दिए जाएंगे, और लॉस वाली शर्तों के सीधे लेनदेन करना पड़ेगा! बाद में कोई वाद विवाद मान्य नहीं होगा।',
      'यूपी शर्तों में शामिल किसी भी क्लाइट की सभी प्रौद्योगिकी वाली शर्तों के सीधे हटा दिए जाएंगे, और लॉस वाली शर्तों के सीधे लेनदेन करना पड़ेगा! बाद में कोई वाद विवाद मान्य नहीं होगा।',
      'यहाँ सभी सट्टे लेजर से मान्य किये जायेंगे।',
      'इंटरनेट कनेक्शन की समस्या की जिम्मेवारी आपकी रहेगी।'
    ],
    footer: 'कृपया सभी नियमों को ध्यानपूर्वक पढ़ें और समझें।'
  };

  const content = language === 'en' ? en : hi;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-gray-50 rounded-lg shadow-md">
      {/* Header with toggle button */}
      {/* Header with language buttons */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-red-600">
          {content.title}
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => setLanguage('hi')}
            className={`px-4 py-2 rounded text-sm md:text-base transition
      ${language === 'hi'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-black hover:bg-gray-300'
              }`}
          >
            हिंदी
          </button>

          <button
            onClick={() => setLanguage('en')}
            className={`px-4 py-2 rounded text-sm md:text-base transition
      ${language === 'en'
                ? 'px-4 py-2 bg-[var(--color-btn-bg)] text-white rounded hover:bg-[var(--color-btn-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition text-sm md:text-base'
                : 'bg-gray-200 text-black hover:bg-gray-300'
              }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Welcome message */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
        <p className="text-base md:text-lg font-semibold">{content.welcome}</p>
      </div>

      {/* Important points */}
      <div className="mb-6">
        <h2 className="text-lg md:text-xl font-semibold mb-2 text-blue-800">{content.important}</h2>
        <ul className="list-disc pl-6 space-y-2 text-sm md:text-base">
          {content.importantPoints.map((point, idx) => (
            <li key={idx}>{point}</li>
          ))}
        </ul>
      </div>

      {/* Warning section */}
      <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-4">
        <h2 className="text-lg md:text-xl font-semibold mb-2 text-red-700">{content.warning}</h2>
        <p className="font-medium mb-2 text-sm md:text-base">{content.warningHeader}</p>
        <ul className="list-decimal pl-6 space-y-2 text-sm md:text-base">
          {content.warningPoints.map((point, idx) => (
            <li key={idx}>{point}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs md:text-sm text-gray-600">{content.noDispute}</p>
      </div>

      {/* Detailed rules */}
      <div>
        <h2 className="text-lg md:text-xl font-semibold mb-2 text-green-800">{content.detailed}</h2>
        <ol className="list-decimal pl-6 space-y-3 text-sm md:text-base">
          {content.rules.map((rule, idx) => (
            <li key={idx}>{rule}</li>
          ))}
        </ol>
      </div>

      {/* Footer note */}
      <div className="mt-6 text-xs md:text-sm text-gray-500 border-t pt-4 text-center">
        <p>{content.footer}</p>
      </div>
    </div>
  );
};

export default Rules;
