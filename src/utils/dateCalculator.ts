import { format, addMonths, addYears, parseISO } from 'date-fns';

export function calculateNextDueDate(testingDate: string | Date, frequencyCategory: string): string {
  const date = typeof testingDate === 'string' ? parseISO(testingDate) : testingDate;

  let nextDate = date;

  switch (frequencyCategory.toLowerCase()) {
    case 'quarterly':
      nextDate = addMonths(date, 3);
      break;
    case 'semiannually':
    case 'semi-annually':
      nextDate = addMonths(date, 6);
      break;
    case 'annually':
    case 'annual':
      nextDate = addYears(date, 1);
      break;
    case 'biannually':
    case 'bi-annual':
      nextDate = addYears(date, 2);
      break;
    default:
      console.warn(`Unknown frequency category: ${frequencyCategory}. Returning original date.`);
      return format(date, 'yyyy-MM-dd');
  }

  return format(nextDate, 'yyyy-MM-dd');
}
