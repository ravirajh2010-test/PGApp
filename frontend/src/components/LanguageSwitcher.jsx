import { useLanguage } from '../context/LanguageContext';

const LanguageSwitcher = () => {
  const { language, changeLanguage, region, changeRegion } = useLanguage();

  return (
    <div className="flex gap-2 items-center">
      <select
        value={region}
        onChange={(e) => changeRegion(e.target.value)}
        className="px-3 py-2 bg-brand-600 text-white border border-brand-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-sm cursor-pointer"
      >
        <option value="IN" className="bg-white text-gray-800">🇮🇳 India</option>
        <option value="UK" className="bg-white text-gray-800">🇬🇧 United Kingdom</option>
      </select>
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-3 py-2 bg-brand-600 text-white border border-brand-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-sm cursor-pointer"
      >
        <option value="en" className="bg-white text-gray-800">English</option>
        <option value="te" className="bg-white text-gray-800">తెలుగు</option>
        <option value="hi" className="bg-white text-gray-800">हिंदी</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
