import { useState, useEffect } from 'react';
import axiosInstance from '@api/axiosInstance';

const ProfileImage = ({
  profileImage,
  src,
  name,
  firstName,
  lastName,
  size = 'md',
  px,
  title,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const actualImg = profileImage || src;

  useEffect(() => {
    setImageError(false);
  }, [actualImg]);

  const sizes = {
    '3xs': 'w-4 h-4 text-[8px]',
    '2xs': 'w-5 h-5 text-[9px]',
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-lg'
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const rawBaseUrl = axiosInstance.defaults.baseURL || '';
    const baseUrl = rawBaseUrl.replace(/\/api\/?$/, '');

    if (typeof imagePath === 'string') {
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      if (imagePath.startsWith('/api/')) {
        return `${baseUrl}${imagePath}`;
      }
      if (imagePath.startsWith('/')) {
        return `${baseUrl}${imagePath}`;
      }
      if (imagePath.includes('serve/')) {
        return `${baseUrl}/api/files/${imagePath.replace(/^\/+/, '')}`;
      }
      const filename = imagePath.split('/').pop();
      return `${baseUrl}/api/files/render/profile/${filename}`;
    }

    return null;
  };

  const getInitials = () => {
    if (firstName || lastName) {
      const first = firstName?.[0] || '';
      const last = lastName?.[0] || '';
      return (first + last).toUpperCase() || 'U';
    }
    if (name || title) {
      const parts = (name || title || '').trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return (parts[0]?.[0] || 'U').toUpperCase();
    }
    return 'U';
  };

  const sizeClass = px ? '' : sizes[size];
  const sizeStyle = px ? { width: px, height: px } : {};
  const showImage = profileImage && !imageError;

  return showImage ? (
    <img
      src={getImageUrl(profileImage)}
      alt={title || 'Profile'}
      title={title}
      className={`${sizeClass} rounded-full object-cover flex-shrink-0 border-2 border-surface ${className}`}
      style={sizeStyle}
      onError={() => setImageError(true)}
    />
  ) : (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 border-2 border-surface bg-[var(--module-accent)] ${className}`}
      style={{ ...sizeStyle, ...(px ? { fontSize: px * 0.38 } : {}) }}
      title={title}
    >
      <span className="font-medium text-white">
        {getInitials()}
      </span>
    </div>
  );
};

export default ProfileImage;