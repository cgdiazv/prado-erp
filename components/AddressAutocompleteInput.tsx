'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface AddressAutocompleteInputProps {
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddressResolved?: (value: ResolvedAddress) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface ResolvedAddress {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  formattedAddress: string;
}

interface PlaceSuggestion {
  placeId: string;
  text: string;
}

interface AutocompleteSuggestionItem {
  placePrediction?: {
    placeId?: string;
    text?: {
      text?: string;
    };
  };
}

interface AutocompleteApiResponse {
  suggestions?: AutocompleteSuggestionItem[];
}

const AUTOCOMPLETE_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_ENDPOINT = 'https://places.googleapis.com/v1/places';

function getAddressComponent(
  components: Array<{ longText?: string; shortText?: string; long_name?: string; short_name?: string; types?: string[] }> | undefined,
  type: string,
  preferShort = false
) {
  if (!components || components.length === 0) return '';
  const match = components.find((component) => component?.types?.includes(type));
  if (!match) return '';

  const longValue = match.longText || match.long_name || '';
  const shortValue = match.shortText || match.short_name || '';

  return preferShort ? shortValue || longValue : longValue || shortValue;
}

async function fetchPlaceDetails(apiKey: string, placeId: string): Promise<ResolvedAddress | null> {
  try {
    const response = await fetch(`${PLACE_DETAILS_ENDPOINT}/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'formattedAddress,addressComponents',
      },
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const components = payload?.addressComponents as
      | Array<{ longText?: string; shortText?: string; long_name?: string; short_name?: string; types?: string[] }>
      | undefined;

    const streetNumber = getAddressComponent(components, 'street_number');
    const route = getAddressComponent(components, 'route');
    const locality = getAddressComponent(components, 'locality');
    const subLocality = getAddressComponent(components, 'sublocality');
    const adminAreaLevel2 = getAddressComponent(components, 'administrative_area_level_2');
    const state = getAddressComponent(components, 'administrative_area_level_1', true);
    const zipCode = getAddressComponent(components, 'postal_code');

    const streetAddress = `${streetNumber} ${route}`.trim();
    const city = locality || subLocality || adminAreaLevel2;

    return {
      streetAddress,
      city,
      state,
      zipCode,
      formattedAddress: payload?.formattedAddress || '',
    };
  } catch {
    return null;
  }
}

export default function AddressAutocompleteInput({
  name,
  defaultValue = '',
  value: controlledValue,
  onChange,
  onAddressResolved,
  placeholder,
  required = false,
  className,
}: AddressAutocompleteInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const [inputValue, setInputValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const requestCounterRef = useRef(0);
  const activeQuery = (controlledValue ?? inputValue).trim();

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

    const query = activeQuery;
    if (query.length < 3) return;

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

        const payload = (await response.json()) as AutocompleteApiResponse;
        if (requestCounterRef.current !== requestId) return;

        const nextSuggestions: PlaceSuggestion[] = (payload?.suggestions || [])
          .map((item) => ({
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
  }, [activeQuery, apiKey]);

  if (!apiKey) {
    return fallbackInput;
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        name={name}
        value={controlledValue ?? inputValue}
        placeholder={placeholder}
        required={required}
        autoComplete="street-address"
        onChange={(event) => {
          setInputValue(event.target.value);
          onChange?.(event);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        className={className}
      />

      {activeQuery.length >= 3 && isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="max-h-56 overflow-y-auto py-1">
            {suggestions.map((suggestion) => (
              <li key={suggestion.placeId}>
                <button
                  type="button"
                  onClick={() => {
                    setInputValue(suggestion.text);
                    setIsOpen(false);

                    const syntheticEvent = {
                      target: { value: suggestion.text },
                    } as React.ChangeEvent<HTMLInputElement>;
                    onChange?.(syntheticEvent);

                    if (apiKey && onAddressResolved) {
                      fetchPlaceDetails(apiKey, suggestion.placeId).then((resolved) => {
                        if (resolved) {
                          onAddressResolved(resolved);
                        }
                      });
                    }
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
