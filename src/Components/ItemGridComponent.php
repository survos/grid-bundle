<?php

declare(strict_types=1);

namespace Survos\Grid\Components;

use Survos\FieldBundle\Service\FieldReader;
use Survos\Grid\Model\Column;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;
use Symfony\UX\TwigComponent\Attribute\PreMount;

#[AsTwigComponent('item_grid', template: '@SurvosGrid/components/item.html.twig')]
class ItemGridComponent
{
    public function __construct(private FieldReader $fieldReader)
    {
    }

    public $data = null;

    public array $columns = [];
    public array|string $exclude = [];

    public ?string $stimulusController = null;

    #[PreMount]
    public function preMount(array $parameters = []): array
    {
        $resolver = new OptionsResolver();
        $resolver->setDefaults([
            'data' => null,
            'class' => null,
            'caller' => null,
            'exclude' => [],
            'columns' => [],
        ]);
        $parameters = $resolver->resolve($parameters);
        $data = $parameters['data'];
        $exclude = $parameters['exclude'];
        if (is_string($exclude)) {
            $exclude = explode(',', $exclude);
        }
        if (is_object($data)) {
            $data = (array) $data;
        }

        if (count($parameters['columns']) === 0) {
            if ($parameters['class']) {
                // entity's own #[Field] attributes are the source of truth for columns
                $parameters['columns'] = array_values(array_filter(
                    array_map(
                        fn ($descriptor) => in_array($descriptor->name, $exclude, true)
                            ? null
                            : Column::fromFieldDescriptor($descriptor),
                        $this->fieldReader->getDescriptors($parameters['class'])
                    )
                ));
            } elseif (is_array($data) && array_is_list($data) && count($data) && is_array($data[0])) {
                $columns = array_diff(array_keys($data[0]), $exclude);
                $parameters['columns'] = $columns;
            } elseif (is_array($data)) {
                $parameters['columns'] = array_diff(array_keys($data), $exclude);
            }
        }
        return $parameters;
    }

    /**
     * @return array<string, Column>
     */
    public function normalizedColumns(): iterable
    {
        $normalizedColumns = [];
        foreach ($this->columns as $c) {
            if ($c instanceof Column) {
                if ($c->condition) {
                    $normalizedColumns[$c->name] = $c;
                }
                continue;
            }
            if (is_string($c)) {
                $c = [
                    'name' => $c,
                ];
            }
            assert(is_array($c));
            $column = new Column(...$c);
            if ($column->condition) {
                $normalizedColumns[$column->name] = $column;
            }
        }
        return $normalizedColumns;
    }
}
