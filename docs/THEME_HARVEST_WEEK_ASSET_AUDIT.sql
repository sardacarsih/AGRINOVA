-- Harvest Week visual asset audit (non-mutating).
-- Scope: web/mobile backgroundImageUrl, illustrationUrl, iconPack, accentAsset.

WITH target AS (
  SELECT
    id,
    campaign_group_key,
    campaign_name,
    assets_json
  FROM theme_campaigns
  WHERE
    campaign_group_key = 'harvest-week'
    OR id = '00000000-0000-0000-0000-000000000202'
    OR campaign_name = 'Harvest Week'
)
SELECT
  id,
  campaign_group_key,
  campaign_name,
  COALESCE(assets_json->'web'->>'backgroundImageUrl', '') AS web_background_image_url,
  COALESCE(assets_json->'web'->>'illustrationUrl', '') AS web_illustration_url,
  COALESCE(assets_json->'web'->>'iconPack', '') AS web_icon_pack,
  COALESCE(assets_json->'web'->>'accentAsset', '') AS web_accent_asset,
  COALESCE(assets_json->'mobile'->>'backgroundImageUrl', '') AS mobile_background_image_url,
  COALESCE(assets_json->'mobile'->>'illustrationUrl', '') AS mobile_illustration_url,
  COALESCE(assets_json->'mobile'->>'iconPack', '') AS mobile_icon_pack,
  COALESCE(assets_json->'mobile'->>'accentAsset', '') AS mobile_accent_asset,
  (
    COALESCE(assets_json->'web'->>'backgroundImageUrl', '') <> ''
    AND COALESCE(assets_json->'web'->>'illustrationUrl', '') <> ''
    AND COALESCE(assets_json->'web'->>'iconPack', '') <> ''
    AND COALESCE(assets_json->'web'->>'accentAsset', '') <> ''
    AND COALESCE(assets_json->'mobile'->>'backgroundImageUrl', '') <> ''
    AND COALESCE(assets_json->'mobile'->>'illustrationUrl', '') <> ''
    AND COALESCE(assets_json->'mobile'->>'iconPack', '') <> ''
    AND COALESCE(assets_json->'mobile'->>'accentAsset', '') <> ''
  ) AS is_complete
FROM target;
