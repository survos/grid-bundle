<?php

namespace Survos\Grid\Components;

use Survos\FieldBundle\Service\FieldReader;
use Survos\Grid\Model\Column;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;
use Symfony\UX\TwigComponent\Attribute\PreMount;

#[AsTwigComponent('grid', template: '@SurvosGrid/components/grid.html.twig')]
class GridComponent
{
    public function __construct(
        private FieldReader $fieldReader,
        public ?string $stimulusController,
    ) {
    }

    public ?iterable $data = null;
    public array $columns = [];
    public bool $search = true;
    public bool $trans = true;
    public string|bool|null $domain = null;
    public int $pageLength = 10;

    public bool $useDatatables = true;
    public bool $info = false;
    public bool $condition = true;
    public string $scrollY = '70vh';
    public string $dom = 'lfrtip';
    public array $searchPanesFields = [];
    public ?string $tableId = null;
    public ?string $rowAlias = null;
    public string $tableClasses = '';
    public ?string $remoteUrl = null;

    #[PreMount]
    public function preMount(array $parameters = []): array
    {
        $resolver = new OptionsResolver();
        $resolver->setDefaults([
            'data' => null,
            'class' => null,
            'dom' => 'lfrtip',
            'rowAlias' => null,
            'useDatatables' => true,
            'pageLength' => 20,
            'tableId' => null,
            'tableClasses' => '',
            'scrollY' => '50vh',
            'remoteUrl' => null,
            'search' => true,
            'info' => false,
            'condition' => true,
            'trans' => false,
            'domain' => null,
            'caller' => null,
            'columns' => [],
        ]);
        $parameters = $resolver->resolve($parameters);

        // data is always supplied by the caller: this component doesn't reach into
        // Doctrine on your behalf. `class` here is only used to derive columns.
        if (count($parameters['columns']) === 0 && $parameters['class']) {
            $parameters['columns'] = array_map(
                fn ($descriptor) => Column::fromFieldDescriptor($descriptor),
                $this->fieldReader->getDescriptors($parameters['class'])
            );
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
            if (empty($c)) {
                continue;
            }
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

    public function searchPanesColumns(): int
    {
        $count = 0;
        // count the number, if > 6 we could figured out the best layout
        foreach ($this->normalizedColumns() as $column) {
            if ($column->inSearchPane) {
                $count++;
            }
        }
        return min($count, 6);
    }
}
