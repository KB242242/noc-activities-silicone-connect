-- Allow larger rich-text descriptions (images + formatted HTML) without truncation.
ALTER TABLE tickets
  MODIFY COLUMN description LONGTEXT NULL;
