import { useLanguage } from '../context/LanguageContext';

const LanguageSwitcher = () => {
  const { language, changeLanguage, region, changeRegion } = useLanguage();

  return (
    <div className="flex gap-1 items-center">
      <select
        value={region}
        onChange={(e) => changeRegion(e.target.value)}
        className="min-w-[96px] px-3 py-1.5 bg-brand-600 text-white border border-brand-400 rounded-xl focus:outline-none focus:ring-1 focus:ring-white text-sm cursor-pointer"
      >
        <option value="IN" className="bg-white text-gray-800">India</option>
        <option value="UK" className="bg-white text-gray-800">Europe</option>
      </select>
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="min-w-[110px] px-3 py-1.5 bg-brand-600 text-white border border-brand-400 rounded-xl focus:outline-none focus:ring-1 focus:ring-white text-sm cursor-pointer"
      >
        <option value="en" className="bg-white text-gray-800">English</option>
        <option value="te" className="bg-white text-gray-800">Telugu</option>
        <option value="hi" className="bg-white text-gray-800">Hindi</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
