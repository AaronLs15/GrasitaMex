import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

const MEXICO_CITY_TIME_ZONE = 'America/Mexico_City';

export function formatInMexicoCity(
    value: Date | string | number,
    formatString: string
): string {
    const date = value instanceof Date ? value : new Date(value);
    return formatInTimeZone(date, MEXICO_CITY_TIME_ZONE, formatString, { locale: es });
}
