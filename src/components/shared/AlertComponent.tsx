import { useAppStore } from '../../stores/appStore';
import './AlertComponent.css';

/**
 * アラート表示コンポーネント
 * 各種通知メッセージを表示する
 */
export function AlertComponent() {
  const { ui: { notifications }, removeNotification } = useAppStore();

  if (!notifications.length) {
    return null;
  }

  return (
    <div className="alert-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`alert alert-${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="alert-content">
            <span className="alert-message">{notification.message}</span>
            <button
              className="alert-close"
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}