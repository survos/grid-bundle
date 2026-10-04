<?php

declare(strict_types=1);

namespace Survos\Grid\Tests;

use PHPUnit\Framework\TestCase;
use Survos\FieldBundle\Service\FieldReader;
use Survos\Grid\Components\GridComponent;
use Survos\Grid\Components\ItemGridComponent;
use Survos\Grid\Model\Column;
use Symfony\Bridge\Twig\Extension\TranslationExtension;
use Symfony\Component\Translation\Translator;
use Symfony\UX\StimulusBundle\Twig\StimulusTwigExtension;
use Symfony\UX\StimulusBundle\Helper\StimulusHelper;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;

require_once __DIR__.'/../src/Components/GridComponent.php';
require_once __DIR__.'/../src/Components/ItemGridComponent.php';
require_once __DIR__.'/../src/Model/Column.php';
require_once __DIR__.'/../src/Twig/TwigExtension.php';

final class GridComponentTest extends TestCase
{
    private function grid(): GridComponent
    {
        return new GridComponent(new FieldReader(), 'survos--grid-bundle--grid');
    }

    public function testRemoteGridRendersExtensionAndColumnConfiguration(): void
    {
        $grid = $this->grid();
        $parameters = $grid->preMount([
            'remoteUrl' => '/rows',
            'columns' => [new Column('title', title: 'Title', sortable: true)],
            'extensions' => ['responsive'],
            'options' => ['responsive' => true],
            'locale' => 'de',
        ]);
        foreach ($parameters as $key => $value) {
            if (property_exists($grid, $key)) $grid->$key = $value;
        }
        $loader = new FilesystemLoader(__DIR__.'/../templates');
        $twig = new Environment($loader, ['strict_variables' => true]);
        $twig->addExtension(new StimulusTwigExtension(new StimulusHelper(null)));
        $twig->addExtension(new TranslationExtension(new Translator('en')));
        $twig->addExtension(new \Survos\Grid\Twig\TwigExtension());
        $twig->addFunction(new \Twig\TwigFunction('path', fn () => '/test'));
        $html = $twig->render('components/grid.html.twig', ['this' => $grid, 'remoteUrl' => '/rows', 'condition' => true]);
        self::assertStringContainsString('<div data-controller="survos--grid-bundle--grid"', $html, 'Controller stays on a stable wrapper while DataTables reparents its table.');
        self::assertStringContainsString('data-survos--grid-bundle--grid-extensions-value="[&quot;responsive&quot;]"', $html);
        self::assertStringContainsString('data-survos--grid-bundle--grid-remote-url-value="/rows"', $html);
        self::assertStringContainsString('&quot;sortable&quot;:true', $html);
        self::assertStringNotContainsString('api-platform', $html);
        $grid->options = [];
        $html = $twig->render('components/grid.html.twig', ['this' => $grid, 'remoteUrl' => '/rows', 'condition' => true]);
        self::assertStringNotContainsString('data-survos--grid-bundle--grid-options-value', $html, 'Omit empty options so Stimulus uses its Object default, not a JSON array.');
    }

    public function testItemGridCanMountEmptyDataWithoutAController(): void
    {
        $item = new ItemGridComponent(new FieldReader());
        self::assertSame([], $item->preMount()['columns']);
        self::assertNull($item->stimulusController);
    }
}
