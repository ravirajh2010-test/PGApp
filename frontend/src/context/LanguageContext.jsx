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

const allMessages = {
  en: flattenMessages(enMessages),
  te: flattenMessages(teMessages),
  hi: flattenMessages(hiMessages)
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const changeLanguage = (lang) => {
    if (allMessages[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      <IntlProvider messages={allMessages[language]} locale={language} defaultLocale="en">
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
};
