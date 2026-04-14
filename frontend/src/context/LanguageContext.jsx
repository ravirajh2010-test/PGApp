import { createContext, useContext, useState, useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import enMessages from '../locales/en.json';
import teMessages from '../locales/te.json';
import hiMessages from '../locales/hi.json';

const LanguageContext = createContext();

// Flatten nested JSON: { auth: { login: "Login" } } => { "auth.login": "Login" }
const flattenMessages = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, key) => {
    const pre = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(acc, flattenMessages(obj[key], pre));
    } else {
      acc[pre] = obj[key];
    }
    return acc;
  }, {});
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

// Region → currency mapping
const REGION_CURRENCY = {
  IN: { symbol: '₹', code: 'INR' },
  UK: { symbol: '£', code: 'GBP' },
};

export const useCurrency = () => {
  const { region } = useLanguage();
  const { symbol, code } = REGION_CURRENCY[region] || REGION_CURRENCY.IN;
  return { currencySymbol: symbol, currencyCode: code, region };
};

const allMessages = {
  en: flattenMessages(enMessages),
  te: flattenMessages(teMessages),
  hi: flattenMessages(hiMessages)
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const [region, setRegion] = useState(() => {
    return localStorage.getItem('region') || 'IN';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('region', region);
  }, [region]);

  const changeLanguage = (lang) => {
    if (allMessages[lang]) {
      setLanguage(lang);
    }
  };

  const changeRegion = (r) => {
    if (REGION_CURRENCY[r]) {
      setRegion(r);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, region, changeRegion }}>
      <IntlProvider messages={allMessages[language]} locale={language} defaultLocale="en">
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
};
