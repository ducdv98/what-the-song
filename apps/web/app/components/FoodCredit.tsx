import type { Credit } from '@wts/topic-food';
import { useI18n } from './I18nProvider';

export function FoodCredit({ credit }: { credit: Credit }) {
  const { t } = useI18n();
  return (
    <p className="food-credit">
      {t('food.credit', { author: credit.author, licence: credit.licence })}
      <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">{t('food.source')}</a>
    </p>
  );
}
