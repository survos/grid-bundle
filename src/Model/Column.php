<?php

namespace Survos\Grid\Model;

use Survos\FieldBundle\Model\FieldDescriptor;

class Column implements \Stringable
{
    public function __construct(
        public string $name,
        public ?string $title = null,
        public ?string $twigTemplate = null, // the actual twig
        public ?string $block = null, // reuse the blocks even if the data changes
        public ?string $route = null,
        public ?string $prefix = null,
        public ?array $actions = null,
        public bool $modal = false,
        public bool $searchable = false,
        public bool $inSearchPane = false,
        public bool $translateValue = false,
        public ?string $domain = null, // null is default, false blocks translation
        public bool $sortable = false,
        public bool|string $locale = false,
        public bool $condition = true,
        public ?string $width = null,
        public ?string $format = null,
    ) {
        if (empty($this->title)) {
            $this->title = $this->name; // when dealing with raw csv, this is confusing
        }
    }

    /**
     * Build a Column from field-bundle's #[Field]-derived metadata, so a table's
     * columns can come from the entity's own attributes instead of being hand-typed.
     * Pass $overrides for anything the caller wants to force (e.g. ['route' => 'x_show']).
     */
    public static function fromFieldDescriptor(FieldDescriptor $descriptor, array $overrides = []): self
    {
        return new self(...[
            'name' => $descriptor->name,
            'title' => $descriptor->getFallbackLabel(),
            'searchable' => $descriptor->searchable,
            'sortable' => $descriptor->sortable,
            'inSearchPane' => $descriptor->facet,
            'condition' => $descriptor->visible,
            'width' => $descriptor->width,
            'format' => $descriptor->format,
            ...$overrides,
        ]);
    }

    public function __toString(): string
    {
        return $this->name;
    }
}
