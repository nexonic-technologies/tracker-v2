import { useState, useEffect } from 'react';
import axiosInstance from '@api/axiosInstance';

const ProfileImage = ({
  profileImage,
  firstName,
  lastName,
  size = 'md',
  px,
  title,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profileImage]);

  const sizes = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-24 h-24 text-xl',
    xl: 'w-32 h-32 text-2xl'
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
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
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