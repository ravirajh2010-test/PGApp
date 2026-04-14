import { useLanguage } from '../context/LanguageContext';

const LanguageSwitcher = () => {
  const { language, changeLanguage, region, changeRegion } = useLanguage();

  return (
    <div className="flex gap-1 items-center">
      <select
        value={region}
        onChange={(e) => changeRegion(e.target.value)}
        className="px-1.5 py-1 bg-brand-600 text-white border border-brand-400 rounded focus:outline-none focus:ring-1 focus:ring-white text-xs cursor-pointer"
      >
        <option value="IN" className="bg-white text-gray-800">IN</option>
        <option value="UK" className="bg-white text-gray-800">GBP</option>
      </select>
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-1.5 py-1 bg-brand-600 text-white border border-brand-400 rounded focus:outline-none focus:ring-1 focus:ring-white text-xs cursor-pointer"
      >
        <option value="en" className="bg-white text-gray-800">EN</option>
        <option value="te" className="bg-white text-gray-800">తె</option>
        <option value="hi" className="bg-white text-gray-800">हि</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
