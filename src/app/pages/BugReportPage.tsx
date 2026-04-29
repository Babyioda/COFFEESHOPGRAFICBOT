import { Bug, Lightbulb } from "lucide-react";

export function BugReportPage() {
  // Ссылки на личные сообщения администратора
  const bugReportUrl = "https://t.me/admin_username"; // Замените на реальную ссылку
  const suggestionUrl = "https://t.me/admin_username"; // Замените на реальную ссылку

  return (
    <div className="flex flex-col min-h-full bg-[#F2F2F7] dark:bg-black font-sans">
      <div className="p-4 bg-white dark:bg-[#1C1C1E] shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Связь с поддержкой</h1>
      </div>

      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
            Нашли ошибку в работе приложения или хотите предложить улучшение? Выберите подходящий вариант.
          </p>

          <div className="space-y-4">
            <a
              href={bugReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 w-full py-4 px-5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-xl font-semibold text-[17px] transition-all shadow-sm"
            >
              <Bug size={24} />
              <span>Сообщить об ошибке</span>
            </a>

            <a
              href={suggestionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 w-full py-4 px-5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-semibold text-[17px] transition-all shadow-sm"
            >
              <Lightbulb size={24} />
              <span>Предложить улучшение</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
