export default function PageHeader({  buttonText, onButtonClick }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {buttonText && (
        <button
          onClick={onButtonClick}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          
          {buttonText}
        </button>
      )}
    </div>
  );
}