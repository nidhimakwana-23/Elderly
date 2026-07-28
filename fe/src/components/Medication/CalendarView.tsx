import React from 'react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ selectedDate, onChangeDate }) => {
  // Generate a week of dates around the selected date
  const generateDates = () => {
    const dates = [];
    for (let i = -3; i <= 3; i++) {
      dates.push(addDays(selectedDate, i));
    }
    return dates;
  };

  const dates = generateDates();

  const handlePrevDay = () => {
    onChangeDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    onChangeDate(addDays(selectedDate, 1));
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{format(selectedDate, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
          <button onClick={handlePrevDay} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => onChangeDate(new Date())} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium rounded-lg transition-colors">
            Today
          </button>
          <button onClick={handleNextDay} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex justify-between overflow-x-auto gap-2 pb-2 hide-scrollbar">
        {dates.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          
          return (
            <button
              key={index}
              onClick={() => onChangeDate(date)}
              className={`flex flex-col items-center min-w-[4rem] p-3 rounded-xl transition-all ${
                isSelected 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105' 
                  : isToday
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <span className={`text-xs font-medium mb-1 ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}>
                {format(date, 'EEE')}
              </span>
              <span className="text-lg font-bold">
                {format(date, 'dd')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
