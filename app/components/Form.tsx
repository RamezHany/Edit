import { ThemeToggle } from "@/components/ThemeToggle";

export default function Form() {
  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md max-w-md w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          نموذج الاتصال
        </h2>
        <ThemeToggle />
      </div>
      
      <form className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            الاسم
          </label>
          <input
            id="name"
            type="text"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          إرسال
        </button>
      </form>
    </div>
  );
} 