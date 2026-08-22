# Plan for Enhancing Nova Streaming App

This plan adds features for dubbed content (PT-BR) and Netflix-trending tags, including visual badges, custom homepage carousels, and admin panel updates.

## User Review Required
> [!IMPORTANT]
> - Should "Dublado" be a fixed text or should we support multiple audio languages in the future?
> - For the Netflix section, do you want it to be automatically populated from a specific source, or managed manually via the admin panel?

---

## Proposed Changes

### Database & Backend
- Update `series` and `episodes` tables to include `is_dubbed` (boolean) and `source_platform` (text) columns.
- Update RLS policies and grants for the new columns.

### UI Enhancements
- Create a reusable `Badge` component with glassmorphism styling for "Dublado" and platform tags.
- Update `SeriesCard`, `HeroBanner`, and `SeriesDetail` to display these badges based on the data.
- Add a new "Populares na Netflix (Dublados)" carousel section to the homepage.
- Implement filtering logic in the navigation/category list to support "Audio Dublado".

### Admin Panel
- Update the Series and Episode forms in `/admin` to include checkboxes for `is_dubbed` and a dropdown for `source_platform`.

## Technical Details
- **Schema Migration**: 
  - `ALTER TABLE public.series ADD COLUMN IF NOT EXISTS is_dubbed BOOLEAN DEFAULT false;`
  - `ALTER TABLE public.series ADD COLUMN IF NOT EXISTS source_platform TEXT;`
- **Frontend**:
  - Use Tailwind's backdrop-blur and semi-transparent backgrounds for glassmorphism badges.
  - Update `useSeries` hooks or similar data fetching to include the new fields.
