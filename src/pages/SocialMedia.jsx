/**
 * SocialMedia — End-to-End Social Media Automation Page
 *
 * 1. Connected Accounts — Real status from backend .env (No fake dummy badges)
 *    - Connected (Green) if keys are present
 *    - API Key Required (Amber/Slate) if keys are missing
 * 2. Create Post — Supports single or multiple photos (Before & After carousel),
 *    caption, connected platforms selection, Post Now vs Schedule
 * 3. Recent Posts — Real feed from database with real statuses (Published, Scheduled, Failed)
 */

import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Video,
  CheckCircle2,
  AlertCircle,
  Clock,
  Key,
  Trash2,
  Send,
  Layers,
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
    createPost,
    publishScheduledPostNow,
    deletePost,
    clearDraft,
    loading: socialLoading,
  } = useSocial();

  const fileInputRef = useRef(null);

  // Form State
  const [caption, setCaption] = useState('');
  const [mediaList, setMediaList] = useState([]); // Array of { url, label, file }
  const [mediaType, setMediaType] = useState('photo');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram']);
  const [postMode, setPostMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [feedbackType, setFeedbackType] = useState('success'); // 'success' | 'error' | 'info'
  const [showConfigHelper, setShowConfigHelper] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Keep selected platforms in sync with accounts if desired
  useEffect(() => {
    // If no platform selected yet, auto-select connected ones
    const connectedIds = accounts.filter((a) => a.connected).map((a) => a.id);
    if (connectedIds.length > 0 && selectedPlatforms.length === 0) {
      setSelectedPlatforms(connectedIds);
    }
  }, [accounts]);

  // Load draft from Client Before/After if present
  useEffect(() => {
    if (draftPost) {
      setCaption(draftPost.caption || '');

      // Load both Before & After photos into mediaList
      if (draftPost.mediaItems && draftPost.mediaItems.length > 0) {
        setMediaList(draftPost.mediaItems);
      } else if (draftPost.mediaUrls && draftPost.mediaUrls.length > 0) {
        setMediaList(
          draftPost.mediaUrls.map((url, i) => ({
            url,
            label: i === 0 && draftPost.beforeMedia ? 'Before' : (i === 1 && draftPost.afterMedia ? 'After' : `Photo ${i + 1}`),
          }))
        );
      } else if (draftPost.media) {
        setMediaList([{ url: draftPost.media, label: 'Photo' }]);
      }

      setMediaType(draftPost.mediaType || 'photo');
      if (draftPost.platforms) {
        setSelectedPlatforms(draftPost.platforms);
      }
      setFeedbackType('info');
      setFeedbackMsg('Before & After photos loaded from Client Profile!');
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  }, [draftPost]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = files.map((file, idx) => {
      const isVid = file.type.startsWith('video/');
      if (isVid) setMediaType('video');
      return {
        url: URL.createObjectURL(file),
        file,
        label: mediaList.length === 0 && idx === 0 ? 'Before' : (mediaList.length === 0 && idx === 1 ? 'After' : `Photo ${mediaList.length + idx + 1}`),
      };
    });

    setMediaList((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMediaItem = (index) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const togglePlatform = (platId) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platId)
        ? prev.filter((p) => p !== platId)
        : [...prev, platId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim() && mediaList.length === 0) {
      setFeedbackType('error');
      setFeedbackMsg('Please add a caption or upload at least one photo/video.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setFeedbackType('error');
      setFeedbackMsg('Please select at least one social media platform.');
      return;
    }

    if (postMode === 'schedule' && (!scheduledDate || !scheduledTime)) {
      setFeedbackType('error');
      setFeedbackMsg('Please select both a date and time for the scheduled post.');
      return;
    }

    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const urls = mediaList.map((m) => m.url);
      const res = await createPost({
        media: urls[0] || null,
        mediaUrls: urls,
        mediaType: urls.length > 1 ? 'CAROUSEL' : mediaType,
        caption,
        platforms: selectedPlatforms,
        isScheduled: postMode === 'schedule',
        scheduledDate,
        scheduledTime,
      });

      setSubmitting(false);

      if (postMode === 'schedule') {
        setFeedbackType('success');
        setFeedbackMsg('Post scheduled successfully! The background scheduler will publish it automatically.');
      } else {
        // Check if any error reported
        if (res?.errorMessage) {
          setFeedbackType('error');
          setFeedbackMsg(res.errorMessage);
        } else {
          setFeedbackType('success');
          setFeedbackMsg('Post published successfully to connected channels!');
        }
      }

      // Reset Form
      setCaption('');
      setMediaList([]);
      setScheduledDate('');
      setScheduledTime('');
      setPostMode('now');
      if (fileInputRef.current) fileInputRef.current.value = '';
      clearDraft();
      setTimeout(() => setFeedbackMsg(null), 6000);
    } catch (err) {
      setSubmitting(false);
      setFeedbackType('error');
      setFeedbackMsg(err?.message || 'Failed to process post. Please check backend .env keys.');
    }
  };

  const handlePublishNow = async (postId) => {
    try {
      await publishScheduledPostNow(postId);
      setFeedbackType('success');
      setFeedbackMsg('Post published now!');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      setFeedbackType('error');
      setFeedbackMsg(err?.message || 'Failed to publish post now.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(postId);
      setFeedbackType('info');
      setFeedbackMsg('Post removed.');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Social Media Automation"
        subtitle="Manage connected channels, create multi-image posts, and view recent broadcasts."
      />

      {/* Feedback Alert Bar */}
      {feedbackMsg && (
        <div
          className={`border rounded-[12px] p-3 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200 ${
            feedbackType === 'success'
              ? 'bg-success-soft border-success/30 text-success'
              : feedbackType === 'error'
              ? 'bg-[#FAECEC] border-[#ECCACA] text-[#B34040]'
              : 'bg-sage-soft border-sage/30 text-charcoal'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackType === 'success' ? (
              <CheckCircle2 size={16} />
            ) : feedbackType === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <Layers size={16} className="text-sage" />
            )}
            <span>{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-muted-gray hover:text-charcoal cursor-pointer ml-4"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. CONNECTED ACCOUNTS (Real Status — No Fake Badges) */}
      <div className="bg-white border border-border rounded-[16px] p-4 sm:p-5 shadow-card w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
            Connected Accounts
          </h3>
          <button
            type="button"
            onClick={() => setShowConfigHelper(!showConfigHelper)}
            className="text-[11px] font-semibold text-sage hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Key size={13} />
            {showConfigHelper ? 'Hide Key Setup' : 'API Key Setup Guide'}
          </button>
        </div>

        {/* Expandable Key Setup Helper */}
        {showConfigHelper && (
          <div className="mb-4 p-3.5 rounded-[12px] bg-soft-cream/60 border border-border text-xs text-charcoal space-y-2 animate-in fade-in">
            <p className="font-semibold text-xs flex items-center gap-1.5 text-sage-hover">
              <Key size={14} /> How Live Social Media Publishing Works:
            </p>
            <p className="text-muted-gray text-[11px] leading-relaxed">
              When you paste your credentials into <code className="bg-white px-1.5 py-0.5 rounded border text-charcoal">backend/.env</code>, the status above will automatically turn to <strong className="text-success font-semibold">Connected</strong>. Everything else (upload, scheduling, Graph API posting) is 100% pre-built and active!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 bg-white rounded-[8px] border border-border/80">
                <span className="font-semibold text-[#1877F2]">Facebook Page & Instagram:</span>
                <ul className="list-disc pl-4 text-muted-gray mt-1 space-y-0.5">
                  <li><code>META_PAGE_ACCESS_TOKEN</code></li>
                  <li><code>META_PAGE_ID</code></li>
                  <li><code>INSTAGRAM_ACCOUNT_ID</code></li>
                </ul>
              </div>
              <div className="p-2 bg-white rounded-[8px] border border-border/80">
                <span className="font-semibold text-charcoal">TikTok Posting:</span>
                <ul className="list-disc pl-4 text-muted-gray mt-1 space-y-0.5">
                  <li><code>TIKTOK_ACCESS_TOKEN</code></li>
                  <li><code>TIKTOK_BUSINESS_ID</code></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-[12px] bg-soft-cream/40 border border-border/70"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    acc.connected ? 'bg-success' : 'bg-warning'
                  }`}
                />
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-charcoal block truncate">{acc.name}</span>
                  <span className="text-[10px] text-muted-gray block truncate">{acc.handle}</span>
                </div>
              </div>

              {/* Status Badge (Authentic — No Fake Connected) */}
              <div className="shrink-0 ml-2">
                {acc.connected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] bg-success-soft text-success border border-success/30">
                    <Check size={11} strokeWidth={2.5} /> Connected
                  </span>
                ) : (
                  <span
                    title={acc.missingKeys ? `Missing: ${acc.missingKeys.join(', ')} in backend .env` : 'API Key Required'}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] bg-warning-soft text-warning border border-warning/30"
                  >
                    API Key Required
                  </span>
                )}
              </div>
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

          {/* Media Upload & Multi-Photo Preview (Before & After) */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*"
              multiple
              className="hidden"
            />

            {mediaList.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-gray">
                  <span>Attached Media ({mediaList.length}) {mediaList.length > 1 && '— Carousel / Transformation'}</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sage hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Upload size={12} /> Add More
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {mediaList.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-[12px] border border-border overflow-hidden bg-soft-cream/40 p-1.5 flex flex-col group"
                    >
                      <div className="aspect-[4/3] rounded-[8px] overflow-hidden bg-charcoal/5 relative">
                        <img
                          src={item.url}
                          alt={item.label}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-[4px] bg-charcoal/80 text-white text-[9px] font-bold uppercase tracking-wider">
                          {item.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMediaItem(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/90 text-[#B34040] hover:bg-[#FAECEC] flex items-center justify-center cursor-pointer shadow-xs"
                          title="Remove photo"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                      <span className="text-[10px] font-medium text-charcoal text-center mt-1 truncate">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border border-dashed border-border hover:border-sage/60 rounded-[12px] flex items-center justify-center gap-2 text-xs font-medium text-muted-gray hover:text-charcoal bg-soft-cream/20 hover:bg-soft-cream/50 transition-all cursor-pointer"
              >
                <Upload size={15} className="text-sage" />
                Upload Photo / Video (Supports multiple photos / Before & After)
              </button>
            )}
          </div>

          {/* Platform Select */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-gray uppercase tracking-wider mb-2">
              Select Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {accounts.map((acc) => {
                const isSelected = selectedPlatforms.includes(acc.id);
                const badge = platformBadges[acc.id] || {};

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => togglePlatform(acc.id)}
                    className={`px-3.5 py-1.5 rounded-[9px] text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? `${badge.bg} ${badge.border} ${badge.text}`
                        : 'bg-soft-cream/50 text-muted-gray border-border hover:text-charcoal'
                    }`}
                  >
                    {isSelected && <Check size={13} strokeWidth={2.5} />}
                    {acc.name}
                    {!acc.connected && (
                      <span className="text-[10px] font-normal opacity-70">(Key Required)</span>
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

            {/* Schedule Date + Time Inputs */}
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
                submitting ||
                socialLoading ||
                (!caption.trim() && mediaList.length === 0) ||
                selectedPlatforms.length === 0 ||
                (postMode === 'schedule' && (!scheduledDate || !scheduledTime))
              }
              className="w-full sm:w-auto h-[42px] px-6"
            >
              {submitting ? (
                'Processing...'
              ) : postMode === 'schedule' ? (
                <>
                  <Clock size={15} /> Schedule Post
                </>
              ) : (
                <>
                  <Send size={15} /> Publish
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* 3. RECENT POSTS (Real Database Feed) */}
      <div className="bg-white border border-border rounded-[16px] shadow-card overflow-hidden w-full">
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
            Recent Posts ({posts.length})
          </h3>
        </div>

        {posts.length === 0 ? (
          <div className="p-8 text-center text-muted-gray text-xs">
            No recent posts found in database.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-soft-cream/30 transition-colors"
              >
                {/* Left: Thumbnail & Platforms + Caption + Date/Time */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 w-full sm:w-auto flex-1">
                  {post.media ? (
                    <div className="relative shrink-0">
                      <img
                        src={post.media}
                        alt="Thumbnail"
                        className="w-12 h-12 rounded-[8px] object-cover border border-border"
                      />
                      {post.mediaUrls && post.mediaUrls.length > 1 && (
                        <span className="absolute bottom-0 right-0 bg-charcoal text-white text-[9px] font-bold px-1 rounded-[3px]">
                          +{post.mediaUrls.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-[8px] bg-soft-cream border border-border flex items-center justify-center text-muted-gray shrink-0">
                      <ImageIcon size={18} />
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
                    {/* Caption Preview */}
                    {post.caption && (
                      <p className="text-xs text-charcoal font-medium line-clamp-1 mb-0.5">
                        {post.caption}
                      </p>
                    )}
                    {/* Date / Time */}
                    <p className="text-[11px] text-muted-gray font-medium">
                      {post.status === 'scheduled'
                        ? `Scheduled: ${post.scheduledAt || post.scheduledDate}`
                        : `Published: ${post.publishedAt || post.createdAt}`}
                    </p>
                    {/* Error message if failed */}
                    {post.errorMessage && (
                      <p className="text-[10px] text-[#B34040] mt-0.5 line-clamp-1">
                        ⚠️ {post.errorMessage}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Status Badge & Actions */}
                <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
                  {post.status === 'scheduled' ? (
                    <>
                      <span className="inline-block px-2.5 py-0.5 rounded-[6px] text-[11px] font-semibold bg-warning-soft text-warning border border-warning/20">
                        Scheduled
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePublishNow(post.id)}
                        className="text-[11px] font-semibold px-2 py-1 rounded-[6px] bg-sage-soft text-sage hover:bg-sage-soft/80 border border-sage/20 cursor-pointer"
                        title="Publish right now"
                      >
                        Publish Now
                      </button>
                    </>
                  ) : post.status === 'published' ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-[6px] text-[11px] font-semibold bg-success-soft text-success border border-success/20">
                      Published
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-0.5 rounded-[6px] text-[11px] font-semibold bg-[#FAECEC] text-[#B34040] border border-[#ECCACA]">
                      Failed
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="p-1 text-muted-gray hover:text-[#B34040] cursor-pointer rounded-[6px] hover:bg-[#FAECEC] transition-colors"
                    title="Delete post"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
