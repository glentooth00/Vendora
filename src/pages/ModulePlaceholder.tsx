
interface ModulePlaceholderProps {
  page: string;
  onBack: () => void;
}

export default function ModulePlaceholder({
  page,
  onBack,
}: ModulePlaceholderProps) {
  return (
    <div className="dashboard-panel module-placeholder">
      <div className="empty-state">
        <div className="empty-state-icon">▤</div>
        <strong>{page}</strong>
        <p>This module is not available yet. We'll build it next.</p>

        <button className="back-dashboard-button" onClick={onBack}>
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
