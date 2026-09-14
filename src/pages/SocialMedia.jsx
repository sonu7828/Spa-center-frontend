/**
 * SocialMedia — Simplified & Polished Social Media Automation Page
 *
 * 1. Connected Accounts — Compact single-row card (Facebook, Instagram, TikTok)
 * 2. Create Post — Upload Photo/Video, Caption, Select Platforms (disabled if Not Connected), Post Now vs Schedule (Date+Time only when Schedule)
 * 3. Recent Posts — Clean unified feed showing Thumbnail, Platforms, Date/Time, Status
 */

import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Video,
  CheckCircle2,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { useSocial } from '../context/SocialContext';

const platformBadges = {
  facebook: { name: 'Facebook', bg: 'bg-[#1877F2]/10', text: 'text-[#1877F2]', border: 'border-[#1877F2]/30' },
  instagram: { name: 'Instagram', bg: 'bg-[#E1306C]/10', text: 'text-[#E1306C]', border: 'border-[#E1306C]/30' },
  tiktok: { name: 'TikTok', bg: 'bg-charcoal/10', text: 'text-charcoal', border: 'border-charcoal/20' },
};

export default function SocialMedia() {
  const {
    accounts,
    posts,
    draftPost,
    toggleAccountConnection,
    createPost,
    clearDraft,
  } = useSocial();

  const fileInputRef = useRef(null);

  // Form State
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState('photo');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram']);
  const [postMode, setPostMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Filter out any disconnected platforms on mount or when accounts change
  useEffect(() => {
    const connectedIds = accounts.filter((a) => a.connected).map((a) => a.id);
    setSelectedPlatforms((prev) => prev.filter((id) => connectedIds.includes(id)));
  }, [accounts]);

  // Load draft from Client Before/After if present
  useEffect(() => {
    if (draftPost) {
      setCaption(draftPost.caption || '');
      setMedia(draftPost.media || null);
      setMediaType(draftPost.mediaType || 'photo');
      if (draftPost.platforms) {
        const connectedIds = accounts.filter((a) => a.connected).map((a) => a.id);
        setSelectedPlatforms(draftPost.platforms.filter((p) => connectedIds.includes(p)));
      }
      setFeedbackMsg('Draft loaded from Client Before/After session');
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  }, [draftPost]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = file.type.startsWith('video/');
    setMediaType(isVid ? 'video' : 'photo');
    setMedia(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMedia(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePlatform = (platId) => {
    const acc = accounts.find((a) => a.id === platId);
    if (!acc || !acc.connected) return; // Disabled if not connected

    setSelectedPlatforms((prev) =>
      prev.includes(platId)
        ? prev.filter((p) => p !== platId)
        : [...prev, platId]
    );
  };

  const handleToggleAccount = (accId) => {
    toggleAccountConnection(accId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!caption.trim() && !media) return;
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one connected social media platform.');
      return;
    }

    if (postMode === 'schedule') {
      if (!scheduledDate || !scheduledTime) {
        alert('Please select both a date and time for the scheduled post.');
        return;
      }
      createPost({
        media,
        mediaType,
        caption,
        platforms: selectedPlatforms,
        isScheduled: true,
        scheduledDate,
        scheduledTime,
      });
      setFeedbackMsg('Post scheduled successfully');
    } else {
      createPost({
        media,
        mediaType,
        caption,
        platforms: selectedPlatforms,
        isScheduled: false,
      });
      setFeedbackMsg('Post published successfully');
    }

    // Reset Form
    setCaption('');
    setMedia(null);
    setScheduledDate('');
    setScheduledTime('');
    setPostMode('now');
    if (fileInputRef.current) fileInputRef.current.value = '';
    clearDraft();
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Social Media Automation"
        subtitle="Manage connected channels, create posts, and view recent broadcasts."
      />

      {feedbackMsg && (
        <div className="bg-success-soft border border-success/30 rounded-[12px] p-3 text-xs font-semibold text-charcoal flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 size={16} />
            <span>{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-muted-gray hover:text-charcoal cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. CONNECTED ACCOUNTS (Compact Single Row Card) */}
      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card w-full">
        <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-3">
          Connected Accounts
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-[12px] bg-soft-cream/40 border border-border/70"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${acc.connected ? 'bg-success' : 'bg-muted-gray/40'}`} />
                <span className="text-sm font-semibold text-charcoal">{acc.name}</span>
              </div>

              <button
                type="button"
                onClick={() => handleToggleAccount(acc.id)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-[7px] border transition-all cursor-pointer ${
                  acc.connected
                    ? 'bg-success-soft text-success border-success/30 hover:bg-[#FAECEC] hover:text-[#B34040] hover:border-[#ECCACA]'
                    : 'bg-white text-muted-gray border-border hover:text-charcoal hover:border-sage'
                }`}
              >
                {acc.connected ? 'Connected' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. CREATE POST */}
      <div className="bg-white border border-border rounded-[16px] p-5 sm:p-6 shadow-card w-full">
        <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider mb-4">
          Create Post
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Caption */}
          <div>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write caption or message..."
              className="w-full p-3.5 bg-white border border-border rounded-[12px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* Media Upload & Preview */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*"
              className="hidden"
            />

            {media ? (
              <div className="relative rounded-[12px] border border-border overflow-hidden bg-soft-cream/40 p-2 flex items-center gap-3">
                {mediaType === 'video' ? (
                  <div className="w-14 h-14 rounded-[8px] bg-charcoal text-white flex items-center justify-center shrink-0">
                    <Video size={20} />
                  </div>
                ) : (
                  <img
                    src={media}
                    alt="Media preview"
                    className="w-14 h-14 object-cover rounded-[8px] border border-border shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-charcoal truncate">
                    {mediaType === 'video' ? 'Video File' : 'Photo Attached'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeMedia}
                  className="text-xs text-[#B34040] hover:underline cursor-pointer mr-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border border-dashed border-border hover:border-sage/60 rounded-[12px] flex items-center justify-center gap-2 text-xs font-medium text-muted-gray hover:text-charcoal bg-soft-cream/20 hover:bg-soft-cream/50 transition-all cursor-pointer"
              >
                <Upload size={15} className="text-sage" />
                Upload Photo / Video
              </button>
            )}
          </div>

          {/* Platform Select (Disabled if Not Connected) */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-gray uppercase tracking-wider mb-2">
              Select Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {accounts.map((acc) => {
                const isSelected = selectedPlatforms.includes(acc.id);
                const badge = platformBadges[acc.id] || {};
                const isConnected = acc.connected;

                return (
                  <button
                    key={acc.id}
                    type="button"
                    disabled={!isConnected}
                    onClick={() => togglePlatform(acc.id)}
                    title={!isConnected ? `${acc.name} is Not Connected` : ''}
                    className={`px-3.5 py-1.5 rounded-[9px] text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      !isConnected
                        ? 'bg-soft-cream/40 text-muted-gray/50 border-border/50 cursor-not-allowed opacity-60'
                        : isSelected
                        ? `${badge.bg} ${badge.border} ${badge.text} cursor-pointer`
                        : 'bg-soft-cream/50 text-muted-gray border-border hover:text-charcoal cursor-pointer'
                    }`}
                  >
                    {isSelected && isConnected && <Check size={13} strokeWidth={2.5} />}
                    {acc.name}
                    {!isConnected && (
                      <span className="text-[10px] font-normal text-muted-gray/70">(Disconnected)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options: Post Now vs Schedule */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 text-xs font-medium text-charcoal cursor-pointer">
                <input
                  type="radio"
                  name="postMode"
                  value="now"
                  checked={postMode === 'now'}
                  onChange={() => setPostMode('now')}
                  className="text-sage focus:ring-sage"
                />
                Post Now
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-charcoal cursor-pointer">
                <input
                  type="radio"
                  name="postMode"
                  value="schedule"
                  checked={postMode === 'schedule'}
                  onChange={() => setPostMode('schedule')}
                  className="text-sage focus:ring-sage"
                />
                Schedule
              </label>
            </div>

            {/* Schedule Date + Time Inputs — ONLY SHOWN WHEN SCHEDULE IS SELECTED */}
            {postMode === 'schedule' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-medium text-muted-gray mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full h-[40px] px-3 bg-white border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-gray mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full h-[40px] px-3 bg-white border border-border rounded-[10px] text-xs text-charcoal outline-none focus:border-sage"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="pt-1">
            <Button
              type="submit"
              disabled={
                (!caption.trim() && !media) ||
                selectedPlatforms.length === 0 ||
                (postMode === 'schedule' && (!scheduledDate || !scheduledTime))
              }
              className="w-full sm:w-auto h-[42px] px-6"
            >
              {postMode === 'schedule' ? 'Schedule Post' : 'Publish'}
            </Button>
          </div>
        </form>
      </div>

      {/* 3. RECENT POSTS (Simple List: Platforms, Date/Time, Status) */}
      <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden w-full">
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
            Recent Posts ({posts.length})
          </h3>
        </div>

        {posts.length === 0 ? (
          <div className="p-8 text-center text-muted-gray text-xs">
            No recent posts.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft-cream/30 transition-colors"
              >
                {/* Left: Thumbnail & Platforms + Date/Time */}
                <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                  {post.media ? (
                    <img
                      src={post.media}
                      alt="Thumbnail"
                      className="w-11 h-11 rounded-[8px] object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-[8px] bg-soft-cream border border-border flex items-center justify-center text-muted-gray shrink-0">
                      <ImageIcon size={16} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {/* Platforms */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {post.platforms.map((p) => {
                        const badge = platformBadges[p] || {};
                        return (
                          <span
                            key={p}
                            className={`px-2 py-0.5 rounded-[5px] text-[10px] font-semibold border ${badge.bg} ${badge.border} ${badge.text}`}
                          >
                            {badge.name || p}
                          </span>
                        );
                      })}
                    </div>
                    {/* Date / Time */}
                    <p className="text-xs text-muted-gray font-medium">
                      {post.status === 'scheduled'
                        ? `Scheduled: ${post.scheduledAt || post.scheduledDate}`
                        : `Published: ${post.publishedAt || post.createdAt}`}
                    </p>
                  </div>
                </div>

                {/* Right: Status Badge */}
                <div className="shrink-0 self-end sm:self-auto">
                  {post.status === 'scheduled' ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-[6px] text-[11px] font-semibold bg-warning-soft text-warning border border-warning/20">
                      Scheduled
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-0.5 rounded-[6px] text-[11px] font-semibold bg-success-soft text-success border border-success/20">
                      Published
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
