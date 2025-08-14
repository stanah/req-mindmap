import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../../stores/appStore';
import './AlertComponent.css';

export const AlertComponent: React.FC = () => {
  const notifications = useAppStore(state => state.ui.notifications);
  const removeNotification = useAppStore(state => state.removeNotification);
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);

  // 通知の表示/非表示を管理
  useEffect(() => {
    notifications.forEach(notification => {
      if (!visibleNotifications.includes(notification.id)) {
        // 新しい通知を表示リストに追加
        setVisibleNotifications(prev => [...prev, notification.id]);

        // 自動非表示の設定
        if (notification.autoHide) {
          setTimeout(() => {
            removeNotification(notification.id);
            setVisibleNotifications(prev => prev.filter(id => id !== notification.id));
          }, notification.duration || 5000);
        }
      }
    });
  }, [notifications, visibleNotifications, removeNotification]);

  // 通知を手動で閉じる
  const handleClose = (notificationId: string) => {
    removeNotification(notificationId);
    setVisibleNotifications(prev => prev.filter(id => id !== notificationId));
  };

  // 全ての通知をクリア
  const handleClearAll = () => {
    notifications.forEach(notification => {
      removeNotification(notification.id);
    });
    setVisibleNotifications([]);
  };

  // アイコンを取得
  const getIcon = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="alert-container">
      {/* 複数の通知がある場合のクリアボタン */}
      {notifications.length > 1 && (
        <div className="alert-header">
          <button
            className="alert-clear-all"
            onClick={handleClearAll}
            title="全ての通知をクリア"
          >
            全てクリア
          </button>
        </div>
      )}

      {/* 通知リスト */}
      <div className="alert-list">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`alert alert--${notification.type} ${
              visibleNotifications.includes(notification.id) ? 'alert--visible' : ''
            }`}
          >
            <div className="alert__content">
              <div className="alert__icon">
                {getIcon(notification.type)}
              </div>
              <div className="alert__message">
                {notification.message}
              </div>
            </div>
            
            <button
              className="alert__close"
              onClick={() => handleClose(notification.id)}
              title="通知を閉じる"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// エラー詳細表示用のコンポーネント
interface ErrorDetailProps {
  error: {
    message: string;
    line?: number;
    column?: number;
    details?: string;
  };
  onClose: () => void;
}

export const ErrorDetail: React.FC<ErrorDetailProps> = ({ error, onClose }) => {
  return (
    <div className="error-detail">
      <div className="error-detail__header">
        <h3 className="error-detail__title">エラー詳細</h3>
        <button
          className="error-detail__close"
          onClick={onClose}
          title="閉じる"
        >
          ✕
        </button>
      </div>
      
      <div className="error-detail__content">
        <div className="error-detail__message">
          <strong>メッセージ:</strong> {error.message}
        </div>
        
        {error.line && (
          <div className="error-detail__location">
            <strong>位置:</strong> 行 {error.line}
            {error.column && `, 列 ${error.column}`}
          </div>
        )}
        
        {error.details && (
          <div className="error-detail__details">
            <strong>詳細:</strong>
            <pre className="error-detail__code">{error.details}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

// インライン通知コンポーネント（エディタ内で使用）
interface InlineNotificationProps {
  message: string;
  type: 'error' | 'warning' | 'info';
  line?: number;
  column?: number;
  onDismiss?: () => void;
}

export const InlineNotification: React.FC<InlineNotificationProps> = ({
  message,
  type,
  line,
  column,
  onDismiss
}) => {
  return (
    <div className={`inline-notification inline-notification--${type}`}>
      <div className="inline-notification__content">
        <span className="inline-notification__icon">
          {getIcon(type)}
        </span>
        <span className="inline-notification__message">
          {message}
        </span>
        {(line || column) && (
          <span className="inline-notification__location">
            ({line && `行${line}`}{line && column && ', '}{column && `列${column}`})
          </span>
        )}
      </div>
      
      {onDismiss && (
        <button
          className="inline-notification__dismiss"
          onClick={onDismiss}
          title="閉じる"
        >
          ✕
        </button>
      )}
    </div>
  );
};

// ヘルパー関数をエクスポート
const getIcon = (type: 'success' | 'error' | 'warning' | 'info') => {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return 'ℹ️';
  }
};