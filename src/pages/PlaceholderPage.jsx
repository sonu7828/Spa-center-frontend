/**
 * PlaceholderPage — Minimal stub for future screens
 *
 * Exists only so sidebar navigation does not break.
 * Will be replaced with real pages in future stages.
 */

import PageHeader from '../components/PageHeader';

export default function PlaceholderPage({ title }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="bg-white border border-border rounded-[16px] p-8 shadow-card text-center">
        <p className="text-sm text-muted-gray">
          This section will be available soon.
        </p>
      </div>
    </div>
  );
}
