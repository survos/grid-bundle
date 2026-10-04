<?php

declare(strict_types=1);

namespace Survos\Grid\Tests;

use PHPUnit\Framework\TestCase;
use Survos\ApiGridBundle\SurvosApiGridBundle;
use Survos\Grid\SurvosGridBundle;
use Survos\Kit\AbstractUxBundle;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Kernel\RequiredBundle;
use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

require_once __DIR__.'/../src/SurvosGridBundle.php';
require_once __DIR__.'/../../api-grid-bundle/src/SurvosApiGridBundle.php';
require_once __DIR__.'/../src/Components/ItemGridComponent.php';
require_once __DIR__.'/../../api-grid-bundle/src/Components/ItemGridComponent.php';

final class BundleWiringTest extends TestCase
{
    public function testBundlesRegisterCanonicalUxNamesAndRequireGrid(): void
    {
        $container = new ContainerBuilder();
        $container->setParameter('kernel.debug', true);
        (new SurvosGridBundle())->build($container);
        (new SurvosApiGridBundle())->build($container);
        $controllers = $container->getParameter(AbstractUxBundle::UX_CONTROLLERS_PARAM);
        self::assertSame(['grid'], $controllers['@survos/grid-bundle']);
        self::assertSame(['api_grid'], $controllers['@survos/api-grid-bundle']);
        $required = (new \ReflectionClass(SurvosApiGridBundle::class))->getAttributes(RequiredBundle::class);
        self::assertSame(SurvosGridBundle::class, $required[0]->newInstance()->class);
    }

    public function testItemComponentNamesDoNotCollide(): void
    {
        $base = new \ReflectionClass(\Survos\Grid\Components\ItemGridComponent::class);
        $api = new \ReflectionClass(\Survos\ApiGridBundle\Components\ItemGridComponent::class);
        self::assertSame('item_grid', $base->getAttributes(AsTwigComponent::class)[0]->getArguments()[0]);
        self::assertSame('api_item_grid', $api->getAttributes(AsTwigComponent::class)[0]->getArguments()[0]);
    }

    public function testGridIsTheOnlyDataTablesPackageOwner(): void
    {
        $owners = [];
        foreach (glob(dirname(__DIR__, 2).'/*/assets/package.json') as $path) {
            if (str_contains(file_get_contents($path), 'datatables.net')) $owners[] = basename(dirname($path, 2));
        }
        self::assertSame(['grid-bundle'], $owners);
        $base = json_decode(file_get_contents(__DIR__.'/../composer.json'), true, flags: JSON_THROW_ON_ERROR);
        $api = json_decode(file_get_contents(__DIR__.'/../../api-grid-bundle/composer.json'), true, flags: JSON_THROW_ON_ERROR);
        self::assertArrayHasKey('survos/grid-bundle', $api['require']);
        self::assertArrayHasKey('api-platform/symfony', $api['require']);
        foreach (array_keys($base['require']) as $package) {
            self::assertFalse(str_starts_with($package, 'api-platform/') || str_starts_with($package, 'pentiminax/'));
        }
    }
}
