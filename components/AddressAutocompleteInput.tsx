'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface AddressAutocompleteInputProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface PlaceSuggestion {
  placeId: string;
  text: string;
}

const AUTOCOMPLETE_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';

export default function AddressAutocompleteInput({
  name,
  defaultValue = '',
  placeholder,
  required = false,
  className,
}: AddressAutocompleteInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const requestCounterRef = useRef(0);

  const fallbackInput = useMemo(
    () => (
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        autoComplete="street-address"
        className={className}
      />
    ),
    [className, defaultValue, name, placeholder, required]
  );

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!apiKey) return;

    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const requestId = ++requestCounterRef.current;
    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(AUTOCOMPLETE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
          },
          body: JSON.stringify({
            input: query,
            includedRegionCodes: ['us'],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const payload = await response.json();
        if (requestCounterRef.current !== requestId) return;

        const nextSuggestions: PlaceSuggestion[] = (payload?.suggestions || [])
          .map((item: any) => ({
            placeId: item?.placePrediction?.placeId || '',
            text: item?.placePrediction?.text?.text || '',
          }))
          .filter((item: PlaceSuggestion) => item.placeId && item.text)
          .slice(0, 6);

        setSuggestions(nextSuggestions);
        setIsOpen(nextSuggestions.length > 0);
      } catch {
        if (requestCounterRef.current === requestId) {
          setSuggestions([]);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [apiKey, value]);

  if (!apiKey) {
    return fallbackInput;
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="street-address"
        onChange={(event) => {
          setValue(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        className={className}
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="max-h-56 overflow-y-auto py-1">
            {suggestions.map((suggestion) => (
              <li key={suggestion.placeId}>
                <button
                  type="button"
                  onClick={() => {
                    setValue(suggestion.text);
                    setIsOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                >
                  {suggestion.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
