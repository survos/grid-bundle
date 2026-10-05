<?php

namespace Survos\Grid\Twig;

use Twig\Environment;
use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigFunction;

class TwigExtension extends AbstractExtension
{
    private function isValidUrl(string $url): bool
    {
        return (bool) filter_var($url, FILTER_VALIDATE_URL);
    }

    public function getFilters(): array
    {
        return [
            new TwigFilter('urlize', fn ($x, $target = 'blank', ?string $label = null) => $this->isValidUrl($x)
                ? sprintf('<a target="%s" href="%s">%s</a>', $target, $x, $label ?: $x)
                : $x, [
                    'is_safe' => ['html'],
                ]),

            new TwigFilter('datatable', [$this, 'datatable'], [
                'needs_environment' => true,
                'is_safe' => ['html'],
            ]),
        ];
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('grid_available', static fn (): bool => true),
            new TwigFunction('setAttribute', function (array $object, $attribute, $value) {
                $object[$attribute] = $value;
                return $object;
            }),
            new TwigFunction('reverseRange', fn ($x, $y): string => sprintf('%s-%s', $x, $y)),
            new TwigFunction('is_array', fn ($x): bool => is_array($x)),
            new TwigFunction('is_object', fn ($x): bool => is_object($x)),
            new TwigFunction('is_json', fn ($x): bool => json_validate($x)),
            new TwigFunction('is_scalar', fn ($x): bool => is_string($x) || is_int($x) || is_numeric($x)),
            new TwigFunction('is_list', fn ($x): bool => is_array($x) && array_is_list($x)),
        ];
    }

    public function datatable(Environment $env, $data): string
    {
        return 'For now, call grid instead.';
    }
}
