<?php

declare(strict_types=1);

namespace Survos\Grid\Tests;

use PHPUnit\Framework\TestCase;
use Symfony\Component\AssetMapper\AssetMapper;
use Symfony\Component\AssetMapper\AssetMapperCompiler;
use Symfony\Component\AssetMapper\AssetMapperRepository;
use Symfony\Component\AssetMapper\CompiledAssetMapperConfigReader;
use Symfony\Component\AssetMapper\Compiler\JavaScriptImportPathCompiler;
use Symfony\Component\AssetMapper\Factory\MappedAssetFactory;
use Symfony\Component\AssetMapper\ImportMap\ImportMapConfigReader;
use Symfony\Component\AssetMapper\ImportMap\ImportMapGenerator;
use Symfony\Component\AssetMapper\ImportMap\RemotePackageStorage;
use Symfony\Component\AssetMapper\Path\PublicAssetsPathResolver;
use Symfony\Component\Filesystem\Filesystem;

final class AssetLoadingTest extends TestCase
{
    public function testAssetMapperDoesNotPreloadDynamicExtensionsOrLazyController(): void
    {
        $directory = sys_get_temp_dir().'/grid-assets-'.bin2hex(random_bytes(6));
        $fs = new Filesystem();
        $fs->mkdir($directory);
        try {
            $assets = dirname(__DIR__).'/assets';
            $package = json_decode(file_get_contents($assets.'/package.json'), true, flags: JSON_THROW_ON_ERROR);
            $map = [];
            // Package implementation is covered by browser.mjs; these leaf assets let
            // Symfony compile the real controller/registry import graph without network.
            foreach ($package['symfony']['importmap'] as $name => $version) {
                $css = str_ends_with($name, '.css');
                $path = 'leaf-'.count($map).($css ? '.css' : '.js');
                file_put_contents($directory.'/'.$path, $css ? 'table {}' : 'export default {};');
                $map[$name] = ['path' => $path, 'type' => $css ? 'css' : 'js'];
            }
            $map['grid'] = ['path' => '@survos/grid-bundle/src/controllers/grid_controller.js', 'entrypoint' => true];
            $map['app'] = ['path' => 'app.js', 'entrypoint' => true];
            file_put_contents($directory.'/app.js', "if (document.querySelector('table')) import('grid');");
            file_put_contents($directory.'/importmap.php', '<?php return '.var_export($map, true).';');
            $config = new ImportMapConfigReader($directory.'/importmap.php', new RemotePackageStorage($directory.'/vendor'));
            $compiled = new CompiledAssetMapperConfigReader($directory.'/public');
            $mapper = null;
            $compiler = new AssetMapperCompiler([new JavaScriptImportPathCompiler($config, 'strict')], static function () use (&$mapper) { return $mapper; });
            $mapper = new AssetMapper(
                new AssetMapperRepository([$directory => '', $assets => '@survos/grid-bundle'], $directory),
                new MappedAssetFactory(new PublicAssetsPathResolver(), $compiler, $directory.'/vendor'),
                $compiled,
            );
            $generator = new ImportMapGenerator($mapper, $compiled, $config);
            $plain = $generator->getImportMapData(['grid']);
            self::assertTrue($plain['datatables.net-bs5']['preload']);
            self::assertTrue($plain['datatables.net-bs5/css/dataTables.bootstrap5.css']['preload']);
            foreach ($plain as $name => $entry) {
                if (str_starts_with($name, 'datatables.net-') && !str_starts_with($name, 'datatables.net-bs5')) {
                    self::assertFalse($entry['preload'] ?? false, $name.' must remain lazy');
                }
            }
            $noGridPage = $generator->getImportMapData(['app']);
            foreach ($noGridPage as $name => $entry) {
                if (str_contains($name, 'grid') || str_contains($name, 'datatables')) {
                    self::assertFalse($entry['preload'] ?? false, $name.' must not load without a grid');
                }
            }
        } finally {
            $fs->remove($directory);
        }
    }
}
